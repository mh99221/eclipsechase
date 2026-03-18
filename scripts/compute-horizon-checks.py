#!/usr/bin/env python3
"""
Pre-compute horizon checks for all curated viewing spots.

Usage:
    python scripts/compute-horizon-checks.py path/to/IslandsDEM_10m.tif spots.json

Input spots.json format:
    [{"id": "arnarstapi", "name": "Arnarstapi", "lat": 64.77, "lng": -23.63,
      "sun_altitude": 24.2, "sun_azimuth": 265}, ...]

Outputs:
    scripts/output/horizon-checks.json
"""
import sys
import json
import os
import math
import numpy as np
import rasterio

EYE_HEIGHT = 1.7
EARTH_RADIUS = 6371000


def move_along_bearing(lat, lng, bearing_deg, distance_m):
    bearing = math.radians(bearing_deg)
    lat_rad = math.radians(lat)
    delta = distance_m / EARTH_RADIUS

    new_lat = math.asin(
        math.sin(lat_rad) * math.cos(delta)
        + math.cos(lat_rad) * math.sin(delta) * math.cos(bearing)
    )
    new_lng = math.radians(lng) + math.atan2(
        math.sin(bearing) * math.sin(delta) * math.cos(lat_rad),
        math.cos(delta) - math.sin(lat_rad) * math.sin(new_lat),
    )
    return math.degrees(new_lat), math.degrees(new_lng)


def sample_distances():
    dists = []
    for d in range(50, 1001, 50):
        dists.append(d)
    for d in range(1200, 5001, 200):
        dists.append(d)
    for d in range(5500, 20001, 500):
        dists.append(d)
    return dists


DISTANCES = sample_distances()


def get_elevation(lat, lng, dataset, band):
    """Get elevation from rasterio dataset using bilinear interpolation."""
    try:
        row, col = dataset.index(lng, lat)
        if 0 <= row < dataset.height and 0 <= col < dataset.width:
            val = band[row, col]
            if val is None or np.isnan(val) or val < -1000:
                return 0.0
            return float(val)
    except Exception:
        pass
    return 0.0


def single_ray(observer_lat, observer_lng, observer_elev, bearing, dataset, band):
    max_angle = -90.0
    blocking_dist = 0
    blocking_elev = 0

    for dist in DISTANCES:
        s_lat, s_lng = move_along_bearing(observer_lat, observer_lng, bearing, dist)
        terrain_elev = get_elevation(s_lat, s_lng, dataset, band)
        elev_diff = terrain_elev - observer_elev
        angle = math.degrees(math.atan2(elev_diff, dist))

        if angle > max_angle:
            max_angle = angle
            blocking_dist = dist
            blocking_elev = terrain_elev

    return max_angle, blocking_dist, blocking_elev


def get_verdict(clearance):
    if clearance > 5:
        return 'clear'
    elif clearance >= 2:
        return 'marginal'
    elif clearance >= 0:
        return 'risky'
    else:
        return 'blocked'


def check_spot(spot, dataset, band):
    lat, lng = spot['lat'], spot['lng']
    sun_alt = spot['sun_altitude']
    sun_azi = spot['sun_azimuth']

    # Observer elevation
    dem_elev = get_elevation(lat, lng, dataset, band)
    observer_elev = (dem_elev if dem_elev > 0 else 2.0) + EYE_HEIGHT

    # Main ray
    max_angle, block_dist, block_elev = single_ray(lat, lng, observer_elev, sun_azi, dataset, band)
    clearance = sun_alt - max_angle
    verdict = get_verdict(clearance)

    # Sweep ±30°
    sweep = []
    for offset in range(-30, 31):
        azi = sun_azi + offset
        normalized_azi = azi % 360
        angle, dist, _ = single_ray(lat, lng, observer_elev, azi, dataset, band)
        sweep.append({
            'azimuth': round(normalized_azi, 1),
            'horizon_angle': round(max(angle, 0), 2),
            'distance_m': round(dist),
        })

    return {
        'spot_id': spot['id'],
        'verdict': verdict,
        'clearance_degrees': round(clearance, 1),
        'max_horizon_angle': round(max_angle, 1),
        'blocking_distance_m': None if verdict == 'clear' else round(block_dist),
        'blocking_elevation_m': None if verdict == 'clear' else round(block_elev),
        'observer_elevation_m': round(observer_elev, 1),
        'sun_altitude': sun_alt,
        'sun_azimuth': sun_azi,
        'checked_at': '2026-04-01T00:00:00Z',
        'sweep': sweep,
    }


def main():
    if len(sys.argv) < 3:
        print("Usage: python compute-horizon-checks.py <dem-geotiff> <spots-json>")
        sys.exit(1)

    dem_path = sys.argv[1]
    spots_path = sys.argv[2]

    with open(spots_path) as f:
        spots = json.load(f)

    output_dir = os.path.join(os.path.dirname(__file__), 'output')
    os.makedirs(output_dir, exist_ok=True)

    results = []

    with rasterio.open(dem_path) as dataset:
        band = dataset.read(1)
        print(f"Loaded DEM: {dataset.width}x{dataset.height}")

        for spot in spots:
            result = check_spot(spot, dataset, band)
            results.append(result)
            print(f"  {spot['name']}: {result['verdict']} ({result['clearance_degrees']}° clearance)")

    output_path = os.path.join(output_dir, 'horizon-checks.json')
    with open(output_path, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\nWrote {len(results)} results to {output_path}")


if __name__ == '__main__':
    main()
