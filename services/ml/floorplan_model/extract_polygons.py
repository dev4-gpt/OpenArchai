# Adapted from https://github.com/Yytsi/floorplan-to-3d (MIT License, see NOTICE.md)
# Trimmed to the SVG-independent mask -> polygon logic only. The original
# file's SVG rendering / CLI / debug-visualization code is dropped since
# this project runs inference on a raw uploaded raster image, not a
# CubiCasa SVG.
"""Turn a 4-class segmentation mask into per-class polygons for 3D extrusion.

Pipeline per class:
    1. Binary mask = (pred == class_id).
    2. Morphological closing (3x3) - bridges 1-px gaps so a wall the model
       drew with a hairline break still becomes one polygon, not two.
    3. cv2.findContours(RETR_CCOMP) - outer contours and one level of holes.
       That's all we need: a wall ring with a doorway cut out is exactly
       one outer + one hole.
    4. cv2.approxPolyDP(epsilon = APPROX_EPSILON_PX) - kills the pixel-
       staircase. Without this every horizontal wall edge is ~50 collinear
       points; with it, two.
    5. Drop polygons whose outer-ring area is below MIN_POLYGON_AREA_PX -
       speckle from model noise that would render as floating debris.
"""

from __future__ import annotations

from typing import TypedDict

import cv2
import numpy as np

from .labels import CLASS_TO_ID

EXTRACT_CLASSES: tuple[str, ...] = ("wall", "door", "window")
CLOSING_KERNEL_PX: int = 3
APPROX_EPSILON_PX: float = 1.5
MIN_POLYGON_AREA_PX: float = 30.0


class Polygon(TypedDict):
    outer: list[list[float]]
    holes: list[list[list[float]]]


def _approx(contour: np.ndarray) -> list[list[float]]:
    """Simplify a cv2 contour and return [[x, y], ...] floats."""
    simplified = cv2.approxPolyDP(contour, APPROX_EPSILON_PX, closed=True)
    return simplified.reshape(-1, 2).astype(float).tolist()


def _polygons_for_class(mask: np.ndarray, class_id: int) -> list[Polygon]:
    """Extract simplified polygons (outer + holes) for one class from a label mask."""
    binary = (mask == class_id).astype(np.uint8)
    if binary.sum() == 0:
        return []

    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (CLOSING_KERNEL_PX, CLOSING_KERNEL_PX))
    closed = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

    contours, hierarchy = cv2.findContours(closed, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    if hierarchy is None:
        return []
    hierarchy = hierarchy[0]

    holes_by_parent: dict[int, list[int]] = {}
    for i, (_, _, _, parent) in enumerate(hierarchy):
        if parent != -1:
            holes_by_parent.setdefault(parent, []).append(i)

    polygons: list[Polygon] = []
    for i, (_, _, _, parent) in enumerate(hierarchy):
        if parent != -1:
            continue
        if cv2.contourArea(contours[i]) < MIN_POLYGON_AREA_PX:
            continue
        outer = _approx(contours[i])
        if len(outer) < 3:
            continue
        holes: list[list[list[float]]] = []
        for j in holes_by_parent.get(i, []):
            if cv2.contourArea(contours[j]) < MIN_POLYGON_AREA_PX:
                continue
            ring = _approx(contours[j])
            if len(ring) >= 3:
                holes.append(ring)
        polygons.append({"outer": outer, "holes": holes})
    return polygons


def mask_to_polygons(mask: np.ndarray) -> dict[str, list[Polygon]]:
    """Run the per-class extraction for every structural class."""
    return {cls: _polygons_for_class(mask, CLASS_TO_ID[cls]) for cls in EXTRACT_CLASSES}
