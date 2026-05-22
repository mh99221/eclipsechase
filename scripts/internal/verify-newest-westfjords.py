#!/usr/bin/env python3
"""Skyfield duration + sun position for the two newest Westfjords spots."""
import math
from skyfield.api import load, wgs84

SPOTS = [
    ('haestahjallafoss-dynjandi', 65.7333457102122, -23.2013961664605),
    ('sandafell-thingeyri',       65.8723927349603, -23.5056712693714),
]

ts = load.timescale()
eph = load("de421.bsp")
sun, moon, earth = eph["sun"], eph["moon"], eph["earth"]


def angsep(ra1, dec1, ra2, dec2):
    a, b, c, d = map(math.radians, [ra1, dec1, ra2, dec2])
    cs = math.sin(b) * math.sin(d) + math.cos(b) * math.cos(d) * math.cos(a - c)
    return math.degrees(math.acos(max(-1, min(1, cs))))


def state(t, location):
    s = location.at(t).observe(sun).apparent()
    m = location.at(t).observe(moon).apparent()
    sr = 0.2666 / s.distance().au
    mr = math.degrees(math.atan(1737.4 / m.distance().km))
    sra, sdec, _ = s.radec()
    mra, mdec, _ = m.radec()
    sep = angsep(sra._degrees, sdec.degrees, mra._degrees, mdec.degrees)
    alt, az, _ = s.altaz()
    return sep, sep < (mr - sr), alt.degrees, az.degrees


for slug, lat, lng in SPOTS:
    location = earth + wgs84.latlon(lat, lng)
    times = ts.linspace(ts.utc(2026, 8, 12, 17, 40, 0),
                        ts.utc(2026, 8, 12, 17, 50, 0), 600)
    c2, c3 = None, None
    min_sep = 999
    a0 = z0 = 0
    for t in times:
        sep, intot, alt, az = state(t, location)
        if sep < min_sep:
            min_sep, a0, z0 = sep, alt, az
        if intot:
            if c2 is None:
                c2 = t
            c3 = t
    dur = (c3.tt - c2.tt) * 86400.0 if c2 is not None else 0
    print(f"{slug}")
    print(f"  C2={c2.utc_iso() if c2 is not None else 'none'} C3={c3.utc_iso() if c3 is not None else 'none'}")
    print(f"  duration={dur:.1f}s  alt={a0:.2f}deg  az={z0:.2f}deg")
    print()
