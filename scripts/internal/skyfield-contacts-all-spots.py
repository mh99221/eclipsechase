#!/usr/bin/env python3
"""Authoritative eclipse contact times for every production spot.

Computes all four contacts (C1/C2/C3/C4), totality duration, and sun
position at mid-totality, bisected to 1s precision from Skyfield at
each spot's exact coordinates.

Inputs:
  scripts/internal/spots-for-skyfield.json — list of {slug,name,region,lat,lng,...}

Outputs:
  stdout: aligned ASCII table
  scripts/internal/skyfield-contacts.json — machine-readable

Usage:
  python scripts/internal/skyfield-contacts-all-spots.py
"""
import json
import math
import os
from datetime import datetime

from skyfield.api import load, wgs84

HERE = os.path.dirname(os.path.abspath(__file__))
SPOTS_JSON = os.path.join(HERE, "spots-for-skyfield.json")
OUT_JSON = os.path.join(HERE, "skyfield-contacts.json")

CONTACT_PRECISION_SECONDS = 1.0
PARTIAL_WINDOW_MIN = 75  # C1 ≈ C2 − 60 min, C4 ≈ C3 + 60 min; 75 is safe

ts = load.timescale()
eph = load("de421.bsp")
sun, moon, earth = eph["sun"], eph["moon"], eph["earth"]


def angsep(ra1, dec1, ra2, dec2):
    a, b, c, d = map(math.radians, [ra1, dec1, ra2, dec2])
    cs = math.sin(b) * math.sin(d) + math.cos(b) * math.cos(d) * math.cos(a - c)
    return math.degrees(math.acos(max(-1.0, min(1.0, cs))))


def radii_and_sep(t, location):
    s = location.at(t).observe(sun).apparent()
    m = location.at(t).observe(moon).apparent()
    sra, sdec, _ = s.radec()
    mra, mdec, _ = m.radec()
    sr = 0.2666 / s.distance().au
    mr = math.degrees(math.atan(1737.4 / m.distance().km))
    sep = angsep(sra._degrees, sdec.degrees, mra._degrees, mdec.degrees)
    return sep, sr, mr, s


def f_outer(t, location):
    sep, sr, mr, _ = radii_and_sep(t, location)
    return sep - (sr + mr)  # f<0 during partial


def f_inner(t, location):
    sep, sr, mr, _ = radii_and_sep(t, location)
    return sep - (mr - sr)  # f<0 during totality


def bisect(t_out, t_in, location, f):
    lo, hi = t_out, t_in
    for _ in range(20):
        mid = ts.tt_jd((lo.tt + hi.tt) / 2.0)
        if f(mid, location) > 0:
            lo = mid
        else:
            hi = mid
        if (hi.tt - lo.tt) * 86400.0 < CONTACT_PRECISION_SECONDS:
            break
    return ts.tt_jd((lo.tt + hi.tt) / 2.0)


def compute_contacts(lat, lng):
    location = earth + wgs84.latlon(lat, lng)

    # Coarse 5s sweep across the totality window to bracket C2/C3
    t0 = ts.utc(2026, 8, 12, 17, 30, 0)
    t1 = ts.utc(2026, 8, 12, 18, 0, 0)
    samples = ts.linspace(t0, t1, 361)
    inner_vals = [(t, f_inner(t, location)) for t in samples]

    first_in = last_in = None
    for i, (t, f) in enumerate(inner_vals):
        if f < 0:
            if first_in is None:
                first_in = i
            last_in = i

    if first_in is None:
        return None  # spot is partial-only — should not happen for our 30

    c2 = bisect(inner_vals[first_in - 1][0], inner_vals[first_in][0], location, f_inner)
    c3 = bisect(inner_vals[last_in + 1][0], inner_vals[last_in][0], location, f_inner)

    # C1 — bisect between (C2 - 75 min) and (C2 - 30s)
    c1_outside = ts.tt_jd(c2.tt - PARTIAL_WINDOW_MIN / 1440.0)
    c1_inside = ts.tt_jd(c2.tt - 30.0 / 86400.0)
    c1 = bisect(c1_outside, c1_inside, location, f_outer)

    # C4 — bisect between (C3 + 30s) and (C3 + 75 min)
    c4_inside = ts.tt_jd(c3.tt + 30.0 / 86400.0)
    c4_outside = ts.tt_jd(c3.tt + PARTIAL_WINDOW_MIN / 1440.0)
    c4 = bisect(c4_outside, c4_inside, location, f_outer)

    # Mid-totality (max obscuration during totality)
    mid_t = ts.tt_jd((c2.tt + c3.tt) / 2.0)
    sep_mid, sr_mid, mr_mid, sun_apparent = radii_and_sep(mid_t, location)
    alt, az, _ = sun_apparent.altaz()

    # Eclipse magnitude at mid (R_moon / R_sun, capped at no overlap)
    magnitude = (sr_mid + mr_mid - sep_mid) / (2 * sr_mid)

    duration_s = (c3.tt - c2.tt) * 86400.0
    partial_total_s = (c4.tt - c1.tt) * 86400.0

    return {
        "c1": c1.utc_iso(places=0),
        "c2": c2.utc_iso(places=0),
        "c3": c3.utc_iso(places=0),
        "c4": c4.utc_iso(places=0),
        "totality_duration_s": round(duration_s, 1),
        "partial_total_s": round(partial_total_s, 1),
        "sun_altitude_deg": round(alt.degrees, 2),
        "sun_azimuth_deg": round(az.degrees, 2),
        "magnitude_at_mid": round(magnitude, 4),
        "moon_radius_arcmin": round(mr_mid * 60, 2),
        "sun_radius_arcmin": round(sr_mid * 60, 2),
    }


def fmt_hms(iso_z):
    # 2026-08-12T17:47:54Z -> 17:47:54
    return iso_z.split("T", 1)[1].rstrip("Z")


def main():
    with open(SPOTS_JSON, encoding="utf-8") as f:
        spots = json.load(f)

    out = []
    print(f"Skyfield contacts (UTC, 1s precision) for all {len(spots)} spots")
    print(f"Eclipse date: 2026-08-12")
    print()
    print(f"{'slug':<32} {'region':<14} {'C1':>9} {'C2':>9} {'C3':>9} {'C4':>9} {'tot':>5} {'partial':>8} {'alt':>5} {'az':>6} {'mag':>6}")
    print("-" * 130)

    # Sort by C2 (totality start) so the output reads like a timeline
    enriched = []
    for s in spots:
        c = compute_contacts(s["lat"], s["lng"])
        if c is None:
            print(f"  {s['slug']}: not in totality??")
            continue
        enriched.append((s, c))
    enriched.sort(key=lambda x: x[1]["c2"])

    for s, c in enriched:
        partial_min = c["partial_total_s"] / 60.0
        print(
            f"{s['slug']:<32} {s['region']:<14} "
            f"{fmt_hms(c['c1']):>9} {fmt_hms(c['c2']):>9} {fmt_hms(c['c3']):>9} {fmt_hms(c['c4']):>9} "
            f"{c['totality_duration_s']:>5.1f} {partial_min:>6.1f}m  "
            f"{c['sun_altitude_deg']:>5.2f} {c['sun_azimuth_deg']:>6.2f} {c['magnitude_at_mid']:>6.4f}"
        )
        out.append({"slug": s["slug"], "name": s["name"], "region": s["region"],
                    "lat": s["lat"], "lng": s["lng"], **c})

    with open(OUT_JSON, "w", encoding="utf-8") as f:
        json.dump({
            "eclipse_date": "2026-08-12",
            "generated": datetime.utcnow().isoformat() + "Z",
            "precision_seconds": CONTACT_PRECISION_SECONDS,
            "spots": out,
        }, f, indent=2)
    print(f"\nWrote {len(out)} spots to {OUT_JSON}")


if __name__ == "__main__":
    main()
