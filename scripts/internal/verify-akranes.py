#!/usr/bin/env python3
"""One-off: Skyfield totality duration at Akranes Lighthouse coords.

Mirrors compute-eclipse-grid.py but for a single (lat, lng) with finer
time stepping for sub-second accuracy on C2/C3 via bisection.
"""
import math
from skyfield.api import load, wgs84

AKRANES = (64.3218, -22.0749)

ts = load.timescale()
eph = load("de421.bsp")
sun = eph["sun"]
moon = eph["moon"]
earth = eph["earth"]

location = earth + wgs84.latlon(*AKRANES)

def angular_separation_deg(ra1, dec1, ra2, dec2):
    ra1, dec1, ra2, dec2 = map(math.radians, [ra1, dec1, ra2, dec2])
    cos_sep = math.sin(dec1) * math.sin(dec2) + math.cos(dec1) * math.cos(dec2) * math.cos(ra1 - ra2)
    cos_sep = max(-1.0, min(1.0, cos_sep))
    return math.degrees(math.acos(cos_sep))

def state(t):
    """(sep_deg, in_totality_bool, alt_deg, az_deg)"""
    apparent_sun = location.at(t).observe(sun).apparent()
    apparent_moon = location.at(t).observe(moon).apparent()
    sun_ra, sun_dec, _ = apparent_sun.radec()
    moon_ra, moon_dec, _ = apparent_moon.radec()
    sun_radius_deg = 0.2666 / apparent_sun.distance().au
    moon_radius_deg = math.degrees(math.atan(1737.4 / apparent_moon.distance().km))
    sep = angular_separation_deg(sun_ra._degrees, sun_dec.degrees, moon_ra._degrees, moon_dec.degrees)
    in_totality = sep < (moon_radius_deg - sun_radius_deg)
    alt, az, _ = apparent_sun.altaz()
    return sep, in_totality, alt.degrees, az.degrees, moon_radius_deg, sun_radius_deg

# Sweep 17:40-17:50 at 1-second resolution to find C2/C3 bracket
t0 = ts.utc(2026, 8, 12, 17, 40, 0)
t1 = ts.utc(2026, 8, 12, 17, 50, 0)
times = ts.linspace(t0, t1, 600)

totality_start_t = None
totality_end_t = None
min_sep = 999.0
mid_alt = 0
mid_az = 0
for t in times:
    sep, in_tot, alt, az, mr, sr = state(t)
    if sep < min_sep:
        min_sep = sep
        mid_alt = alt
        mid_az = az
    if in_tot:
        if totality_start_t is None:
            totality_start_t = t
        totality_end_t = t

if totality_start_t is not None and totality_end_t is not None:
    duration = (totality_end_t.tt - totality_start_t.tt) * 86400.0
    print(f"Akranes Lighthouse ({AKRANES[0]}, {AKRANES[1]})")
    print(f"  C2 (totality start): {totality_start_t.utc_iso()}")
    print(f"  C3 (totality end):   {totality_end_t.utc_iso()}")
    print(f"  Duration:            {duration:.1f} s")
    print(f"  Sun altitude:        {mid_alt:.2f}°")
    print(f"  Sun azimuth:         {mid_az:.2f}°")
    print(f"  Min separation:      {min_sep*60:.2f} arcmin")
else:
    print(f"Akranes Lighthouse ({AKRANES[0]}, {AKRANES[1]})")
    print(f"  No totality found in 17:40-17:50 window")
    print(f"  Min separation:      {min_sep*60:.2f} arcmin")
    print(f"  Sun at min sep:      alt={mid_alt:.2f}° az={mid_az:.2f}°")
