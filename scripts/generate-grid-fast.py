#!/usr/bin/env python3
"""
Generate approximate eclipse grid data for western Iceland.
Uses geometric approximation based on known eclipse parameters
rather than full Skyfield computation.

Known parameters for Aug 12, 2026 eclipse in Iceland:
- Centerline enters Westfjords ~65.8N, crosses Snaefellsnes ~64.8N,
  exits over Reykjanes ~63.9N
- Totality path width: ~200 km
- Maximum duration on centerline: ~2m18s (Westfjords)
- Totality starts ~17:43 UTC (Westfjords), ~17:46 UTC (Reykjanes)
- Sun altitude at mid-totality: ~24 degrees
- Sun azimuth: ~285 degrees (WNW)
"""

import json
import math
import os
from datetime import datetime, timezone

LAT_MIN, LAT_MAX = 63.5, 66.5
LNG_MIN, LNG_MAX = -24.5, -20.5
GRID_STEP = 0.15

# Centerline approximate coordinates (lng, lat pairs)
# Eclipse moves from NW to SE across Iceland
CENTERLINE = [
    (-24.5, 66.2),
    (-23.5, 65.8),
    (-22.8, 65.4),
    (-22.2, 65.0),
    (-21.8, 64.7),
    (-21.5, 64.5),
    (-21.2, 64.2),
    (-20.8, 63.9),
    (-20.5, 63.7),
]

# Path half-width in degrees latitude (~100km ≈ 0.9 deg lat)
PATH_HALF_WIDTH = 0.9

# Max duration on centerline in seconds (varies by position)
MAX_DURATION_NW = 138  # 2m18s in Westfjords
MAX_DURATION_SE = 70   # ~1m10s at Reykjanes


def point_to_centerline_distance(lat, lng):
    """Find minimum distance from point to centerline (in degrees)."""
    min_dist = 999
    closest_idx = 0
    for i, (clng, clat) in enumerate(CENTERLINE):
        dist = math.sqrt((lat - clat) ** 2 + ((lng - clng) * math.cos(math.radians(lat))) ** 2)
        if dist < min_dist:
            min_dist = dist
            closest_idx = i
    return min_dist, closest_idx


def centerline_progress(idx):
    """How far along the centerline (0=NW, 1=SE)."""
    return idx / (len(CENTERLINE) - 1)


def compute_grid():
    points = []

    for lat_i in range(int((LAT_MAX - LAT_MIN) / GRID_STEP) + 1):
        lat = LAT_MIN + lat_i * GRID_STEP
        for lng_i in range(int((LNG_MAX - LNG_MIN) / GRID_STEP) + 1):
            lng = LNG_MIN + lng_i * GRID_STEP

            dist, idx = point_to_centerline_distance(lat, lng)
            progress = centerline_progress(idx)

            point = {
                "lat": round(lat, 4),
                "lng": round(lng, 4),
                "sun_altitude": 24.0,
                "sun_azimuth": 285.0,
            }

            if dist <= PATH_HALF_WIDTH:
                # Inside totality path
                # Duration decreases with distance from centerline (parabolic)
                edge_factor = 1.0 - (dist / PATH_HALF_WIDTH) ** 2
                max_dur = MAX_DURATION_NW + (MAX_DURATION_SE - MAX_DURATION_NW) * progress
                duration = max(0, max_dur * edge_factor)

                # Totality start time: 17:43:00 UTC (NW) to 17:46:30 UTC (SE)
                start_seconds = 17 * 3600 + 43 * 60 + progress * 210  # 3.5 min spread
                start_h = int(start_seconds // 3600)
                start_m = int((start_seconds % 3600) // 60)
                start_s = int(start_seconds % 60)

                end_seconds = start_seconds + duration

                point["totality_start"] = f"2026-08-12T{start_h:02d}:{start_m:02d}:{start_s:02d}Z"
                end_h = int(end_seconds // 3600)
                end_m = int((end_seconds % 3600) // 60)
                end_s = int(end_seconds % 60)
                point["totality_end"] = f"2026-08-12T{end_h:02d}:{end_m:02d}:{end_s:02d}Z"
                point["duration_seconds"] = round(duration, 1)

                # Slight sun altitude variation
                point["sun_altitude"] = round(23.5 + progress * 1.5, 1)
            else:
                point["totality_start"] = None
                point["totality_end"] = None
                point["duration_seconds"] = 0

            points.append(point)

    return points


if __name__ == "__main__":
    print("Generating approximate eclipse grid...")
    grid = compute_grid()
    in_totality = len([p for p in grid if p["totality_start"]])

    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "eclipse-data")
    os.makedirs(out_dir, exist_ok=True)

    out_path = os.path.join(out_dir, "grid.json")
    with open(out_path, "w") as f:
        json.dump(
            {
                "eclipse_date": "2026-08-12",
                "generated": datetime.now(timezone.utc).isoformat(),
                "grid_step_degrees": GRID_STEP,
                "total_points": len(grid),
                "in_totality": in_totality,
                "approximate": True,
                "points": grid,
            },
            f,
            indent=2,
        )

    print(f"Done. {len(grid)} points, {in_totality} in totality path.")
    print(f"Saved to {out_path}")
