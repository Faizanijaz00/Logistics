#!/usr/bin/env python3
"""Remove background from an image using rembg. Called by the Node server."""
import sys
from rembg import remove
from PIL import Image

if len(sys.argv) != 3:
    print("Usage: remove_bg.py <input_path> <output_path>", file=sys.stderr)
    sys.exit(1)

input_path = sys.argv[1]
output_path = sys.argv[2]

input_image = Image.open(input_path)
output_image = remove(input_image)
output_image.save(output_path, "PNG")
