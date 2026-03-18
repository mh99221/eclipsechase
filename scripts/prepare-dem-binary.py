#!/usr/bin/env python3
"""
Crop ÍslandsDEM to western Iceland and export as Float32 binary for server use.

Usage:
    python scripts/prepare-dem-binary.py path/to/IslandsDEM_10m.tif

Outputs:
    server/data/dem/west-iceland-30m.bin
    server/data/dem/west-iceland-30m.meta.json
"""
import sys
import json
import os
import numpy as np
import rasterio
from rasterio.transform import from_bounds
from rasterio.warp import reproject, Resampling

# Western Iceland bounding box
BBOX = {
    'minLat': 63.8,
    'maxLat': 66.2,
    'minLng': -24.5,
    'maxLng': -18.0,
}

TARGET_CELLSIZE = 0.00027  # ~30m in latitude


def main():
    if len(sys.argv) < 2:
        print("Usage: python prepare-dem-binary.py <input-geotiff>")
        sys.exit(1)

    input_path = sys.argv[1]
    output_dir = os.path.join(os.path.dirname(__file__), '..', 'server', 'data', 'dem')
    os.makedirs(output_dir, exist_ok=True)

    with rasterio.open(input_path) as src:
        # Calculate output dimensions
        height = int((BBOX['maxLat'] - BBOX['minLat']) / TARGET_CELLSIZE)
        width = int((BBOX['maxLng'] - BBOX['minLng']) / TARGET_CELLSIZE)

        # Create output transform (south-to-north: origin at bottom-left)
        # rasterio uses north-to-south by default, so we export and then flip
        transform = from_bounds(
            BBOX['minLng'], BBOX['minLat'], BBOX['maxLng'], BBOX['maxLat'],
            width, height,
        )

        dst_array = np.empty((height, width), dtype=np.float32)

        reproject(
            source=rasterio.band(src, 1),
            destination=dst_array,
            dst_transform=transform,
            dst_crs='EPSG:4326',
            resampling=Resampling.bilinear,
        )

        # rasterio reprojects in north-to-south order. Flip to south-to-north.
        dst_array = np.flipud(dst_array)

        # Replace NaN/nodata with 0 (ocean)
        dst_array = np.nan_to_num(dst_array, nan=0.0, posinf=0.0, neginf=0.0)

        # Write binary
        bin_path = os.path.join(output_dir, 'west-iceland-30m.bin')
        dst_array.tofile(bin_path)
        print(f"Wrote {bin_path} ({os.path.getsize(bin_path) / 1e6:.1f} MB)")

        # Write metadata
        meta = {
            'minLat': BBOX['minLat'],
            'maxLat': BBOX['maxLat'],
            'minLng': BBOX['minLng'],
            'maxLng': BBOX['maxLng'],
            'width': width,
            'height': height,
            'cellSizeLat': TARGET_CELLSIZE,
            'cellSizeLng': TARGET_CELLSIZE,
            'rowOrder': 'south-to-north',
        }
        meta_path = os.path.join(output_dir, 'west-iceland-30m.meta.json')
        with open(meta_path, 'w') as f:
            json.dump(meta, f, indent=2)
        print(f"Wrote {meta_path}")
        print(f"Grid: {width} x {height} = {width * height:,} cells")


if __name__ == '__main__':
    main()
