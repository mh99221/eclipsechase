#!/usr/bin/env python3
"""
Compute eclipse geometry for a grid of points across western Iceland.
Uses Skyfield to calculate totality times, partial-phase contact times
(C1/C4), duration, and sun position for the August 12, 2026 total
solar eclipse.

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

# Partial-phase search window — partial lasts ~60 min on each side of
# totality across the Iceland path, with a generous margin.
PARTIAL_WINDOW_BEFORE_C2_MIN = 75
PARTIAL_WINDOW_AFTER_C3_MIN = 75

# Bisection precision target — 1 second of real time. With a 75-min
# window this is ~12 bisection iterations per contact.
CONTACT_PRECISION_SECONDS = 1.0


def angular_separation_deg(ra1, dec1, ra2, dec2):
    """Great-circle angular separation between two sky positions (all in degrees)."""
    ra1, dec1, ra2, dec2 = map(math.radians, [ra1, dec1, ra2, dec2])
    cos_sep = (
        math.sin(dec1) * math.sin(dec2)
        + math.cos(dec1) * math.cos(dec2) * math.cos(ra1 - ra2)
    )
    cos_sep = max(-1.0, min(1.0, cos_sep))
    return math.degrees(math.acos(cos_sep))


def sep_minus_outer_threshold(t, location, sun, moon):
    """
    f(t) = angular_sep(moon, sun) − (R_sun + R_moon)
    f > 0 outside partial phase, f <= 0 during partial phase.
    Roots of f are C1 (entering) and C4 (exiting).
    """
    apparent_sun = location.at(t).observe(sun).apparent()
    apparent_moon = location.at(t).observe(moon).apparent()
    sun_ra, sun_dec, _ = apparent_sun.radec()
    moon_ra, moon_dec, _ = apparent_moon.radec()
    sun_dist_au = apparent_sun.distance().au
    moon_dist_km = apparent_moon.distance().km
    sun_radius_deg = 0.2666 / sun_dist_au
    moon_radius_deg = math.degrees(math.atan(1737.4 / moon_dist_km))
    sep = angular_separation_deg(
        sun_ra._degrees, sun_dec.degrees,
        moon_ra._degrees, moon_dec.degrees,
    )
    return sep - (sun_radius_deg + moon_radius_deg)


def bisect_contact(ts, t_outside, t_inside, location, sun, moon):
    """
    Find the contact time between t_outside (f > 0, no partial) and
    t_inside (f < 0, in partial) by bisection. Returns a Skyfield Time.
    """
    lo, hi = t_outside, t_inside
    for _ in range(20):  # 75 min window ≈ 12 iterations to reach 1s
        mid_jd = (lo.tt + hi.tt) / 2.0
        mid = ts.tt_jd(mid_jd)
        f_mid = sep_minus_outer_threshold(mid, location, sun, moon)
        if f_mid > 0:
            lo = mid
        else:
            hi = mid
        if (hi.tt - lo.tt) * 86400.0 < CONTACT_PRECISION_SECONDS:
            break
    # Average the bracket — sub-second residual at this point.
    return ts.tt_jd((lo.tt + hi.tt) / 2.0)


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

    # C2/C3 search: 17:30–18:00 UTC, every 5 seconds
    t0 = ts.utc(2026, 8, 12, 17, 30, 0)
    t1 = ts.utc(2026, 8, 12, 18, 0, 0)
    num_steps = 360
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

                sun_ra, sun_dec, _ = apparent_sun.radec()
                moon_ra, moon_dec, _ = apparent_moon.radec()

                sun_dist_au = apparent_sun.distance().au
                moon_dist_km = apparent_moon.distance().km

                sun_radius_deg = 0.2666 / sun_dist_au
                moon_radius_deg = math.degrees(math.atan(1737.4 / moon_dist_km))

                sep = angular_separation_deg(
                    sun_ra._degrees, sun_dec.degrees,
                    moon_ra._degrees, moon_dec.degrees,
                )

                if sep < min_sep:
                    min_sep = sep
                    alt, az, _ = apparent_sun.altaz()
                    mid_sun_alt = alt.degrees
                    mid_sun_az = az.degrees

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

                # C1 — bisect between (C2 - 75 min) and (C2 - small) so the
                # bracket spans the f > 0 → f <= 0 transition.
                c2_jd = totality_start_t.tt
                c1_outside = ts.tt_jd(c2_jd - PARTIAL_WINDOW_BEFORE_C2_MIN / 1440.0)
                c1_inside = ts.tt_jd(c2_jd - 30.0 / 86400.0)  # C2 - 30s, safely inside
                c1_t = bisect_contact(ts, c1_outside, c1_inside, location, sun, moon)

                # C4 — bisect between (C3 + small) and (C3 + 75 min).
                c3_jd = totality_end_t.tt
                c4_inside = ts.tt_jd(c3_jd + 30.0 / 86400.0)
                c4_outside = ts.tt_jd(c3_jd + PARTIAL_WINDOW_AFTER_C3_MIN / 1440.0)
                c4_t = bisect_contact(ts, c4_outside, c4_inside, location, sun, moon)

                point["c1"] = c1_t.utc_iso()
                point["c4"] = c4_t.utc_iso()
            else:
                point["totality_start"] = None
                point["totality_end"] = None
                point["duration_seconds"] = 0
                point["c1"] = None
                point["c4"] = None

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
