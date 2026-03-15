#!/usr/bin/env python3
"""
Compute eclipse geometry for a grid of points across western Iceland.
Uses Skyfield to calculate totality times, duration, and sun position
for the August 12, 2026 total solar eclipse.

Output: public/eclipse-data/grid.json
"""

import json
import math
import os
from datetime import datetime, timezone

import numpy as np
from skyfield.api import load, wgs84


# Grid bounds: western Iceland (covers totality path)
LAT_MIN, LAT_MAX = 63.5, 66.5
LNG_MIN, LNG_MAX = -24.5, -20.5
GRID_STEP = 0.15  # ~400-500 points


def angular_separation_deg(ra1, dec1, ra2, dec2):
    """Great-circle angular separation between two sky positions (all in degrees)."""
    ra1, dec1, ra2, dec2 = map(math.radians, [ra1, dec1, ra2, dec2])
    cos_sep = (
        math.sin(dec1) * math.sin(dec2)
        + math.cos(dec1) * math.cos(dec2) * math.cos(ra1 - ra2)
    )
    cos_sep = max(-1.0, min(1.0, cos_sep))
    return math.degrees(math.acos(cos_sep))


def compute_grid():
    ts = load.timescale()
    eph = load("de421.bsp")
    sun = eph["sun"]
    moon = eph["moon"]
    earth = eph["earth"]

    lats = np.arange(LAT_MIN, LAT_MAX + GRID_STEP / 2, GRID_STEP)
    lngs = np.arange(LNG_MIN, LNG_MAX + GRID_STEP / 2, GRID_STEP)

    total = len(lats) * len(lngs)
    print(f"Computing {total} grid points...")

    # Time window around totality: 17:30 - 18:00 UTC, every 5 seconds
    t0 = ts.utc(2026, 8, 12, 17, 30, 0)
    t1 = ts.utc(2026, 8, 12, 18, 0, 0)
    num_steps = 360  # 30 min * 60s / 5s
    times = ts.linspace(t0, t1, num_steps)

    points = []
    done = 0

    for lat in lats:
        for lng in lngs:
            location = earth + wgs84.latlon(float(lat), float(lng))

            totality_start_t = None
            totality_end_t = None
            mid_sun_alt = 0.0
            mid_sun_az = 0.0
            min_sep = 999.0

            for t in times:
                apparent_sun = location.at(t).observe(sun).apparent()
                apparent_moon = location.at(t).observe(moon).apparent()

                # Angular positions
                sun_ra, sun_dec, _ = apparent_sun.radec()
                moon_ra, moon_dec, _ = apparent_moon.radec()

                # Angular radii
                sun_dist_au = apparent_sun.distance().au
                moon_dist_km = apparent_moon.distance().km

                sun_radius_deg = 0.2666 / sun_dist_au
                moon_radius_deg = math.degrees(math.atan(1737.4 / moon_dist_km))

                # Separation between centers
                sep = angular_separation_deg(
                    sun_ra._degrees, sun_dec.degrees,
                    moon_ra._degrees, moon_dec.degrees,
                )

                if sep < min_sep:
                    min_sep = sep
                    alt, az, _ = apparent_sun.altaz()
                    mid_sun_alt = alt.degrees
                    mid_sun_az = az.degrees

                # Totality check: moon fully covers sun
                if sep < (moon_radius_deg - sun_radius_deg):
                    if totality_start_t is None:
                        totality_start_t = t
                    totality_end_t = t

            point = {
                "lat": round(float(lat), 4),
                "lng": round(float(lng), 4),
                "sun_altitude": round(mid_sun_alt, 1),
                "sun_azimuth": round(mid_sun_az, 1),
            }

            if totality_start_t is not None and totality_end_t is not None:
                duration = (totality_end_t.tt - totality_start_t.tt) * 86400.0
                point["totality_start"] = totality_start_t.utc_iso()
                point["totality_end"] = totality_end_t.utc_iso()
                point["duration_seconds"] = round(duration, 1)
            else:
                point["totality_start"] = None
                point["totality_end"] = None
                point["duration_seconds"] = 0

            points.append(point)

            done += 1
            if done % 50 == 0:
                in_path = len([p for p in points if p["totality_start"]])
                print(f"  {done}/{total} points ({in_path} in totality)...")

    return points


if __name__ == "__main__":
    print("Computing eclipse grid for August 12, 2026...")
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
                "points": grid,
            },
            f,
            indent=2,
        )

    print(f"\nDone. {len(grid)} points total, {in_totality} in totality path.")
    print(f"Saved to {out_path}")
