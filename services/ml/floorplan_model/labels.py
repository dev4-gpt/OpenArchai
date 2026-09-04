# Adapted from https://github.com/Yytsi/floorplan-to-3d (MIT License, see NOTICE.md)
"""Class taxonomy for the floor / wall / door / window segmentation model."""

CLASS_NAMES: tuple[str, ...] = ("floor", "wall", "door", "window")
CLASS_TO_ID: dict[str, int] = {n: i for i, n in enumerate(CLASS_NAMES)}
NUM_CLASSES: int = len(CLASS_NAMES)
FLOOR_ID: int = CLASS_TO_ID["floor"]
