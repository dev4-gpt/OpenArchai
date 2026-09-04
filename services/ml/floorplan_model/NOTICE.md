Files in this directory (`labels.py`, `model.py`, `checkpoint.py`, `extract_polygons.py`)
are adapted from [Yytsi/floorplan-to-3d](https://github.com/Yytsi/floorplan-to-3d)
(model weights: [Yytsi/floorplan-to-3d-walls](https://huggingface.co/Yytsi/floorplan-to-3d-walls) on Hugging Face),
Copyright (c) 2026 Tuukka Yildirim, MIT License.

`extract_polygons.py` has been trimmed to the SVG-independent mask → polygon
logic only (the original file's SVG rendering / CLI / debug-visualization
code was dropped since this project's input is a raw uploaded raster image,
not a CubiCasa SVG). `checkpoint.py` keeps only the `.safetensors` loading
path, since that's the format the released weights ship in.
