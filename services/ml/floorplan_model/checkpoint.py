# Adapted from https://github.com/Yytsi/floorplan-to-3d (MIT License, see NOTICE.md)
# Trimmed to the .safetensors path only — that's the format the released
# weights (Yytsi/floorplan-to-3d-walls on Hugging Face) ship in.
"""Load model weights from .safetensors."""

from __future__ import annotations

from pathlib import Path

import torch
from safetensors import safe_open
from safetensors.torch import load_file


def load_inference_checkpoint(
    path: Path, device: torch.device
) -> tuple[dict[str, torch.Tensor], int | None]:
    """Return (state_dict, epoch)."""
    target = "cuda" if device.type == "cuda" else "cpu"
    state = load_file(str(path), device=target)
    with safe_open(str(path), framework="pt") as f:
        meta = f.metadata() or {}
    epoch = int(meta["epoch"]) if meta.get("epoch") else None
    return state, epoch
