#!/usr/bin/env python3
"""
Crop ÍslandsDEM to western Iceland and export as Float32 binary for server use.

Usage:
    pip install tifffile numpy pyproj imagecodecs zarr
    python scripts/prepare-dem-binary.py path/to/DEM2.tif

Outputs:
    server/data/dem/west-iceland-30m.bin
    server/data/dem/west-iceland-30m.meta.json

Note: DEM2.tif is ~14GB compressed (LERC), 2m resolution, 260001x185001 pixels.
This script uses tifffile's zarr interface to read tiles on demand without
loading the full ~180GB image into memory.
"""
import sys
import json
import os
import numpy as np

# Western Iceland bounding box (WGS84 / EPSG:4326)
BBOX_LAT_MIN = 63.8
BBOX_LAT_MAX = 66.2
BBOX_LNG_MIN = -24.5
BBOX_LNG_MAX = -18.0

TARGET_CELLSIZE = 0.00027  # ~30m in latitude


def main():
    if len(sys.argv) < 2:
        print("Usage: python prepare-dem-binary.py <input-geotiff>")
        sys.exit(1)

    import tifffile
    from pyproj import Transformer

    input_path = sys.argv[1]
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'server', 'data', 'dem')
    os.makedirs(output_dir, exist_ok=True)

    print(f"Reading metadata from {input_path}...")
    tif = tifffile.TiffFile(input_path)
    page = tif.pages[0]
    tags = page.tags

    img_width = tags['ImageWidth'].value
    img_height = tags['ImageLength'].value

    tp = tags['ModelTiepointTag'].value
    ps = tags['ModelPixelScaleTag'].value

    origin_x = tp[3] - tp[0] * ps[0]
    origin_y = tp[4] + tp[1] * ps[1]
    pixel_size = ps[0]  # 2m

    # Detect CRS
    crs_code = 8088  # ISN2004 default
    geokeys = tags.get('GeoKeyDirectoryTag')
    if geokeys:
        keys = geokeys.value
        for i in range(4, len(keys), 4):
            if keys[i] == 3072:
                crs_code = keys[i + 3]

    print(f"Image: {img_width} x {img_height}, pixel: {pixel_size}m, CRS: EPSG:{crs_code}")
    print(f"Tiled: {page.is_tiled}, tile: {page.tilewidth}x{page.tilelength}, compression: {page.compression}")

    # Open zarr store for tile-based access (reads tiles on demand, no full load)
    print("Opening zarr store for tiled access...")
    store = page.aszarr()
    import zarr
    z = zarr.open(store, mode='r')
    # Handle extra dimensions — squeeze to 2D
    while z.ndim > 2:
        z = z[0]
    print(f"Zarr array: shape={z.shape}, dtype={z.dtype}, chunks={z.chunks}")

    # Set up coordinate transformers
    inv_transformer = Transformer.from_crs("EPSG:4326", f"EPSG:{crs_code}", always_xy=True)

    # Output grid dimensions
    out_height = int((BBOX_LAT_MAX - BBOX_LAT_MIN) / TARGET_CELLSIZE)
    out_width = int((BBOX_LNG_MAX - BBOX_LNG_MIN) / TARGET_CELLSIZE)
    print(f"Output grid: {out_width} x {out_height} ({out_width * out_height:,} cells)")

    # Pre-compute all source pixel coordinates for each output row/col
    # to batch zarr reads by tile
    print("Computing coordinate mapping...")
    output = np.zeros((out_height, out_width), dtype=np.float32)

    # Process row by row — for each output row, transform all lng values at once
    print("Resampling (this takes several minutes)...")
    lngs = np.array([BBOX_LNG_MIN + (c + 0.5) * TARGET_CELLSIZE for c in range(out_width)])

    for row in range(out_height):
        lat = BBOX_LAT_MIN + (row + 0.5) * TARGET_CELLSIZE

        if row % 1000 == 0:
            pct = row / out_height * 100
            print(f"  {pct:.0f}% — row {row}/{out_height} (lat={lat:.3f}°)")

        # Transform all points in this row to source CRS at once
        lats = np.full_like(lngs, lat)
        src_xs, src_ys = inv_transformer.transform(lngs, lats)

        # Convert to pixel coordinates
        src_cols = ((src_xs - origin_x) / pixel_size).astype(int)
        src_rows = ((origin_y - src_ys) / pixel_size).astype(int)

        # Find the range of source rows/cols needed for this output row
        valid = (src_rows >= 0) & (src_rows < img_height) & (src_cols >= 0) & (src_cols < img_width)

        if not np.any(valid):
            continue

        r_min, r_max = src_rows[valid].min(), src_rows[valid].max()
        c_min, c_max = src_cols[valid].min(), src_cols[valid].max()

        # Read the needed strip from zarr (tile-based, only fetches required tiles)
        strip = z[r_min:r_max + 1, c_min:c_max + 1].astype(np.float32)

        # Sample values using nearest-neighbor
        for col in range(out_width):
            if not valid[col]:
                continue
            r = src_rows[col] - r_min
            c = src_cols[col] - c_min
            val = strip[r, c]
            if np.isnan(val) or val < -1e6:
                val = 0.0
            output[row, col] = val

    tif.close()

    # Write binary
    bin_path = os.path.join(output_dir, 'west-iceland-30m.bin')
    output.tofile(bin_path)
    file_mb = os.path.getsize(bin_path) / 1e6
    print(f"Wrote {bin_path} ({file_mb:.1f} MB)")

    # Write metadata
    meta = {
        'minLat': BBOX_LAT_MIN,
        'maxLat': BBOX_LAT_MAX,
        'minLng': BBOX_LNG_MIN,
        'maxLng': BBOX_LNG_MAX,
        'width': out_width,
        'height': out_height,
        'cellSizeLat': TARGET_CELLSIZE,
        'cellSizeLng': TARGET_CELLSIZE,
        'rowOrder': 'south-to-north',
    }
    meta_path = os.path.join(output_dir, 'west-iceland-30m.meta.json')
    with open(meta_path, 'w') as f:
        json.dump(meta, f, indent=2)
    print(f"Wrote {meta_path}")
    print(f"Grid: {out_width} x {out_height} = {out_width * out_height:,} cells")

    elev_valid = output[output > 0]
    if len(elev_valid):
        print(f"Elevation range: {elev_valid.min():.1f} to {elev_valid.max():.1f} m")
    print("Done!")


if __name__ == '__main__':
    main()
