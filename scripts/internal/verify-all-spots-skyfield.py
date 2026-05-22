#!/usr/bin/env python3
"""Authoritative Skyfield check for every production viewing spot.

Reads scripts/internal/spots-for-skyfield.json (produced by the
sibling Node extractor), computes C2/C3 by bisection at ~1s precision
for each spot's exact coords, then prints a per-spot diff vs. the
stored values.

Mirror of the algorithm in scripts/compute-eclipse-grid.py but for an
explicit list of points instead of a regular grid.
"""
import json
import math
import os
from datetime import datetime, timezone

from skyfield.api import load, wgs84

HERE = os.path.dirname(os.path.abspath(__file__))
SPOTS_JSON = os.path.join(HERE, "spots-for-skyfield.json")

CONTACT_PRECISION_SECONDS = 1.0
SEARCH_HALF_WINDOW_MIN = 15  # C2/C3 lie well inside ±15 min of 17:45 UTC for all Iceland

ts = load.timescale()
eph = load("de421.bsp")
sun = eph["sun"]
moon = eph["moon"]
earth = eph["earth"]


def angsep(ra1, dec1, ra2, dec2):
    a, b, c, d = map(math.radians, [ra1, dec1, ra2, dec2])
    cs = math.sin(b) * math.sin(d) + math.cos(b) * math.cos(d) * math.cos(a - c)
    return math.degrees(math.acos(max(-1.0, min(1.0, cs))))


def sep_minus_inner_threshold(t, location):
    """f(t) = angular_sep − (R_moon − R_sun). f<0 during totality, f>0 outside."""
    s = location.at(t).observe(sun).apparent()
    m = location.at(t).observe(moon).apparent()
    sra, sdec, _ = s.radec()
    mra, mdec, _ = m.radec()
    sr = 0.2666 / s.distance().au
    mr = math.degrees(math.atan(1737.4 / m.distance().km))
    sep = angsep(sra._degrees, sdec.degrees, mra._degrees, mdec.degrees)
    return sep - (mr - sr), s


def bisect_contact(t_outside, t_inside, location):
    """Find the root of f(t) between t_outside (f>0) and t_inside (f<0)."""
    lo, hi = t_outside, t_inside
    for _ in range(20):
        mid_jd = (lo.tt + hi.tt) / 2.0
        mid = ts.tt_jd(mid_jd)
        f_mid, _ = sep_minus_inner_threshold(mid, location)
        if f_mid > 0:
            lo = mid
        else:
            hi = mid
        if (hi.tt - lo.tt) * 86400.0 < CONTACT_PRECISION_SECONDS:
            break
    return ts.tt_jd((lo.tt + hi.tt) / 2.0)


def compute_spot(lat, lng):
    location = earth + wgs84.latlon(lat, lng)
    # Sweep every 5s across ±15 min of 17:45 UTC to find rough C2/C3
    t0 = ts.utc(2026, 8, 12, 17, 30, 0)
    t1 = ts.utc(2026, 8, 12, 18, 0, 0)
    times = ts.linspace(t0, t1, 361)  # 5s steps
    samples = []
    for t in times:
        f, sa = sep_minus_inner_threshold(t, location)
        samples.append((t, f, sa))

    # Find first/last sample with f<0
    first_inside = None
    last_inside = None
    for i, (t, f, _) in enumerate(samples):
        if f < 0:
            if first_inside is None:
                first_inside = i
            last_inside = i

    if first_inside is None:
        # No totality — record min separation and sun position at min
        min_idx = min(range(len(samples)), key=lambda i: samples[i][1])
        alt, az, _ = samples[min_idx][2].altaz()
        return {
            "in_totality": False,
            "duration_s": 0,
            "c2": None,
            "c3": None,
            "alt_deg": alt.degrees,
            "az_deg": az.degrees,
        }

    # Bisect C2 between last sample with f>0 before first_inside, and first_inside
    c2 = bisect_contact(samples[first_inside - 1][0], samples[first_inside][0], location)
    # Bisect C3 between last_inside and first sample with f>0 after
    c3 = bisect_contact(samples[last_inside + 1][0], samples[last_inside][0], location)

    # Sun position at mid-totality
    mid_jd = (c2.tt + c3.tt) / 2.0
    mid = ts.tt_jd(mid_jd)
    _, sa_mid = sep_minus_inner_threshold(mid, location)
    alt, az, _ = sa_mid.altaz()

    return {
        "in_totality": True,
        "duration_s": (c3.tt - c2.tt) * 86400.0,
        "c2": c2.utc_iso(),
        "c3": c3.utc_iso(),
        "alt_deg": alt.degrees,
        "az_deg": az.degrees,
    }


def parse_stored_start(s):
    """'2026-08-12 17:47:54+00' → datetime"""
    s = s.replace(" ", "T").replace("+00", "+00:00")
    return datetime.fromisoformat(s)


def main():
    with open(SPOTS_JSON, encoding="utf-8") as f:
        spots = json.load(f)

    print(f"Skyfield verification of {len(spots)} spots\n")
    print(f"{'slug':<32} {'stored_dur':>10} {'sky_dur':>9} {'ddur':>6}  "
          f"{'stored_alt':>10} {'sky_alt':>8} {'dalt':>6}  "
          f"{'stored_az':>9} {'sky_az':>7} {'daz':>6}  start_drift")
    print("-" * 130)

    rows = []
    for s in spots:
        r = compute_spot(s["lat"], s["lng"])
        stored_dt = parse_stored_start(s["stored_start"])
        sky_c2 = datetime.fromisoformat(r["c2"].replace("Z", "+00:00")) if r["c2"] else None
        start_drift = int((stored_dt - sky_c2).total_seconds()) if sky_c2 else None
        d_dur = s["stored_duration"] - r["duration_s"]
        d_alt = s["stored_alt"] - r["alt_deg"]
        d_az = s["stored_az"] - r["az_deg"]
        flag = ""
        if abs(d_dur) > 5: flag += "D"
        if abs(d_alt) > 0.3: flag += "A"
        if abs(d_az) > 1.0: flag += "Z"
        if start_drift is not None and abs(start_drift) > 10: flag += "S"
        rows.append((s["slug"], s["stored_duration"], r["duration_s"], d_dur,
                     s["stored_alt"], r["alt_deg"], d_alt,
                     s["stored_az"], r["az_deg"], d_az, start_drift, flag, r))

        print(f"{s['slug']:<32} {s['stored_duration']:>10} {r['duration_s']:>9.1f} {d_dur:>+6.1f}  "
              f"{s['stored_alt']:>10.2f} {r['alt_deg']:>8.2f} {d_alt:>+6.2f}  "
              f"{s['stored_az']:>9.2f} {r['az_deg']:>7.2f} {d_az:>+6.2f}  "
              f"{start_drift if start_drift is not None else '   - ':>+5}s  {flag}")

    print()
    flagged = [r for r in rows if r[11]]
    print(f"Flagged (ddur>5s or dalt>0.3deg or daz>1.0deg or start_drift>10s): {len(flagged)} / {len(rows)}")
    for r in flagged:
        slug, sd, kd, dd, sa, ka, da, sz, kz, dz, sdrift, flag, _ = r
        print(f"  {slug:<32}  {flag}  dur:{sd}->{kd:.1f} ({dd:+.1f})  alt:{sa}->{ka:.2f} ({da:+.2f})  az:{sz}->{kz:.2f} ({dz:+.2f})  start:{sdrift:+d}s")


if __name__ == "__main__":
    main()
