// Extract (slug, lat, lng, stored values) for all production spots → JSON
// that the Skyfield verifier can consume.
import fs from 'node:fs';

const sql = fs.readFileSync('scripts/viewing_spots_rows.sql', 'utf8');

// Find unquoted top-level commas in a tuple body
function fieldPositions(t) {
  const positions = [-1];
  let inStr = false, depth = 0;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (c === "'") {
        if (t[i + 1] === "'") { i++; continue; }
        inStr = false;
      }
    } else {
      if (c === "'") inStr = true;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) positions.push(i);
    }
  }
  positions.push(t.length);
  return positions;
}

function splitTuples(sqlStr) {
  const start = sqlStr.indexOf('VALUES');
  let i = sqlStr.indexOf('(', start);
  const tuples = [];
  while (i < sqlStr.length && i !== -1) {
    let depth = 0, inStr = false, buf = '';
    for (; i < sqlStr.length; i++) {
      const c = sqlStr[i];
      if (inStr) {
        buf += c;
        if (c === "'") {
          if (sqlStr[i + 1] === "'") { buf += "'"; i++; }
          else inStr = false;
        }
      } else {
        if (c === "'") { inStr = true; buf += c; }
        else if (c === '(') { depth++; if (depth > 1) buf += c; }
        else if (c === ')') { depth--; if (depth === 0) { tuples.push(buf); buf = ''; i++; break; } else buf += c; }
        else if (depth > 0) buf += c;
      }
    }
    while (i < sqlStr.length && sqlStr[i] !== '(') i++;
  }
  return tuples;
}

const tuples = splitTuples(sql);
// Column order from the export header
const COLS = ['id','name','slug','lat','lng','region','description','parking_info','terrain_notes','has_services','cell_coverage','totality_duration_seconds','totality_start','sun_altitude','sun_azimuth','spot_type','trail_distance_km','trail_time_minutes','difficulty','elevation_gain_m','trailhead_lat','trailhead_lng','photos','horizon_check','warnings','nearby_poi','observer_height_above_ground'];

const out = [];
for (const t of tuples) {
  const positions = fieldPositions(t);
  const fields = {};
  for (let j = 0; j < COLS.length; j++) {
    let raw = t.slice(positions[j] + 1, positions[j + 1]).trim();
    if (raw.startsWith("'") && raw.endsWith("'")) raw = raw.slice(1, -1).replace(/''/g, "'");
    fields[COLS[j]] = raw;
  }
  out.push({
    slug: fields.slug,
    name: fields.name,
    region: fields.region,
    lat: Number(fields.lat),
    lng: Number(fields.lng),
    stored_duration: Number(fields.totality_duration_seconds),
    stored_start: fields.totality_start,
    stored_alt: Number(fields.sun_altitude),
    stored_az: Number(fields.sun_azimuth),
  });
}

fs.writeFileSync('scripts/internal/spots-for-skyfield.json', JSON.stringify(out, null, 2));
console.log(`Wrote ${out.length} spots to scripts/internal/spots-for-skyfield.json`);
