#!/usr/bin/env python3
"""Spot-check 8 points from the regenerated grid.json against a fresh
Skyfield bisection at the same coords. After the C2/C3 fix in
compute-eclipse-grid.py the agreement should be sub-second."""
import json
import math
import os
from datetime import datetime

from skyfield.api import load, wgs84

HERE = os.path.dirname(os.path.abspath(__file__))
GRID = os.path.join(HERE, "..", "..", "public", "eclipse-data", "grid.json")

ts = load.timescale()
eph = load("de421.bsp")
sun, moon, earth = eph["sun"], eph["moon"], eph["earth"]

CONTACT_PRECISION_SECONDS = 1.0


def angsep(ra1, dec1, ra2, dec2):
    a, b, c, d = map(math.radians, [ra1, dec1, ra2, dec2])
    cs = math.sin(b) * math.sin(d) + math.cos(b) * math.cos(d) * math.cos(a - c)
    return math.degrees(math.acos(max(-1.0, min(1.0, cs))))


def f_inner(t, location):
    s = location.at(t).observe(sun).apparent()
    m = location.at(t).observe(moon).apparent()
    sra, sdec, _ = s.radec()
    mra, mdec, _ = m.radec()
    sr = 0.2666 / s.distance().au
    mr = math.degrees(math.atan(1737.4 / m.distance().km))
    sep = angsep(sra._degrees, sdec.degrees, mra._degrees, mdec.degrees)
    return sep - (mr - sr)


def bisect(t_out, t_in, location):
    lo, hi = t_out, t_in
    for _ in range(20):
        mid = ts.tt_jd((lo.tt + hi.tt) / 2.0)
        if f_inner(mid, location) > 0:
            lo = mid
        else:
            hi = mid
        if (hi.tt - lo.tt) * 86400.0 < CONTACT_PRECISION_SECONDS:
            break
    return ts.tt_jd((lo.tt + hi.tt) / 2.0)


def sky_duration(lat, lng):
    location = earth + wgs84.latlon(lat, lng)
    t0 = ts.utc(2026, 8, 12, 17, 30, 0)
    t1 = ts.utc(2026, 8, 12, 18, 0, 0)
    times = ts.linspace(t0, t1, 361)
    samples = [(t, f_inner(t, location)) for t in times]
    first = last = None
    for i, (t, f) in enumerate(samples):
        if f < 0:
            if first is None:
                first = i
            last = i
    if first is None:
        return None, None
    c2 = bisect(samples[first - 1][0], samples[first][0], location)
    c3 = bisect(samples[last + 1][0], samples[last][0], location)
    return (c3.tt - c2.tt) * 86400.0, c2.utc_iso(places=0)


def main():
    with open(GRID, encoding="utf-8") as f:
        grid = json.load(f)

    # Sample 8 spots near the centerline and the edges
    sample_coords = [
        (65.6, -23.45),   # centerline, longest duration area
        (64.85, -23.75),  # Snæfellsnes peninsula
        (64.3, -22.1),    # Akranes area (edge)
        (64.15, -22.0),   # Reykjavík (edge)
        (66.0, -23.15),   # Ísafjörður area
        (65.55, -24.45),  # Látrabjarg
        (63.85, -22.45),  # Blue Lagoon area
        (64.95, -22.65),  # Reykjavík fringe
    ]

    print(f"Grid {grid['generated']}  step={grid['grid_step_degrees']}  in_totality={grid['in_totality']}\n")
    print(f"{'lat':>7} {'lng':>8} {'grid_dur':>9} {'sky_dur':>8} {'ddur':>6}  {'grid_start':>22} {'sky_start':>22} dstart")
    print("-" * 110)

    worst_dur = 0
    worst_start = 0
    for lat, lng in sample_coords:
        # find nearest grid point
        best, bd = None, 1e9
        for p in grid["points"]:
            d = (p["lat"] - lat) ** 2 + (p["lng"] - lng) ** 2
            if d < bd:
                bd, best = d, p
        if not best["totality_start"]:
            print(f"{best['lat']:>7.3f} {best['lng']:>8.3f}  no totality at grid point")
            continue
        sky_d, sky_c2 = sky_duration(best["lat"], best["lng"])
        if sky_d is None:
            print(f"{best['lat']:>7.3f} {best['lng']:>8.3f}  no totality from skyfield")
            continue
        d_dur = best["duration_seconds"] - sky_d
        grid_dt = datetime.fromisoformat(best["totality_start"].replace("Z", "+00:00"))
        sky_dt = datetime.fromisoformat(sky_c2.replace("Z", "+00:00"))
        d_start = (grid_dt - sky_dt).total_seconds()
        worst_dur = max(worst_dur, abs(d_dur))
        worst_start = max(worst_start, abs(d_start))
        print(f"{best['lat']:>7.3f} {best['lng']:>8.3f} {best['duration_seconds']:>9.1f} {sky_d:>8.1f} {d_dur:>+6.1f}  "
              f"{best['totality_start']:>22} {sky_c2:>22} {d_start:>+5.0f}s")

    print(f"\nWorst |ddur| = {worst_dur:.1f}s   worst |dstart| = {worst_start:.0f}s")
    print("Pass: <2s on both. Anything larger means the C2/C3 bisection still has a bug.")


if __name__ == "__main__":
    main()
