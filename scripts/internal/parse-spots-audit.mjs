// Audit helper: parse Supabase exports + grid.json, emit per-spot JSON dossier.
import fs from 'node:fs';
import path from 'node:path';

const repo = path.resolve('.');
const spotsSql = fs.readFileSync(path.join(repo, 'scripts/viewing_spots_rows.sql'), 'utf8');
const transSql = fs.readFileSync(path.join(repo, 'scripts/viewing_spot_translations_rows.sql'), 'utf8');
const horizonSql = fs.readFileSync(path.join(repo, 'scripts/output/seed-horizon-checks.sql'), 'utf8');
const grid = JSON.parse(fs.readFileSync(path.join(repo, 'public/eclipse-data/grid.json'), 'utf8'));

// --- robust SQL VALUES tuple splitter ---
function splitTuples(sql) {
  const start = sql.indexOf('VALUES');
  if (start < 0) return [];
  let i = sql.indexOf('(', start);
  const tuples = [];
  while (i < sql.length && i !== -1) {
    let depth = 0;
    let inStr = false;
    let buf = '';
    for (; i < sql.length; i++) {
      const c = sql[i];
      if (inStr) {
        buf += c;
        if (c === "'") {
          // double '' is escaped quote
          if (sql[i + 1] === "'") { buf += "'"; i++; }
          else inStr = false;
        }
      } else {
        if (c === "'") { inStr = true; buf += c; }
        else if (c === '(') { depth++; if (depth > 1) buf += c; }
        else if (c === ')') { depth--; if (depth === 0) { tuples.push(buf); buf = ''; i++; break; } else buf += c; }
        else if (depth > 0) buf += c;
      }
    }
    // advance to next tuple
    while (i < sql.length && sql[i] !== '(') i++;
  }
  return tuples;
}

function splitFields(tuple) {
  const out = [];
  let buf = '';
  let inStr = false;
  let depth = 0;
  for (let i = 0; i < tuple.length; i++) {
    const c = tuple[i];
    if (inStr) {
      if (c === "'") {
        if (tuple[i + 1] === "'") { buf += "'"; i++; }
        else { inStr = false; }
      } else buf += c;
    } else {
      if (c === "'") inStr = true;
      else if (c === '(') { depth++; buf += c; }
      else if (c === ')') { depth--; buf += c; }
      else if (c === ',' && depth === 0) { out.push(buf.trim()); buf = ''; }
      else buf += c;
    }
  }
  if (buf.length) out.push(buf.trim());
  return out;
}

const COLS = ['id','name','slug','lat','lng','region','description','parking_info','terrain_notes','has_services','cell_coverage','totality_duration_seconds','totality_start','sun_altitude','sun_azimuth','spot_type','trail_distance_km','trail_time_minutes','difficulty','elevation_gain_m','trailhead_lat','trailhead_lng','photos','horizon_check','warnings','nearby_poi','observer_height_above_ground'];

const num = v => (v === 'null' || v === '' ? null : Number(v));
const str = v => (v === 'null' ? null : v);
const json = v => { if (v === 'null') return null; try { return JSON.parse(v); } catch { return v; } };

const rawTuples = splitTuples(spotsSql);
const spots = rawTuples.map(t => {
  const f = splitFields(t);
  const row = {};
  COLS.forEach((c, i) => row[c] = f[i]);
  return {
    id: row.id, name: row.name, slug: row.slug,
    lat: num(row.lat), lng: num(row.lng), region: row.region,
    description: row.description?.slice(0, 80), parking_info: row.parking_info?.slice(0, 60),
    has_services: row.has_services, cell_coverage: row.cell_coverage,
    totality_duration_seconds: num(row.totality_duration_seconds),
    totality_start: row.totality_start,
    sun_altitude: num(row.sun_altitude), sun_azimuth: num(row.sun_azimuth),
    spot_type: row.spot_type, difficulty: row.difficulty,
    trail_distance_km: num(row.trail_distance_km), trail_time_minutes: num(row.trail_time_minutes),
    elevation_gain_m: num(row.elevation_gain_m),
    trailhead_lat: num(row.trailhead_lat), trailhead_lng: num(row.trailhead_lng),
    photos_raw: row.photos, horizon_check_raw: row.horizon_check, warnings_raw: row.warnings,
    nearby_poi_raw: row.nearby_poi,
    observer_height_above_ground: num(row.observer_height_above_ground),
  };
});

// --- horizon checks: count slugs covered ---
const horizonSlugs = new Set();
const horizonReg = /WHERE\s+slug\s*=\s*'([^']+)'/g;
let m; while ((m = horizonReg.exec(horizonSql))) horizonSlugs.add(m[1]);

// --- translations ---
const transTuples = splitTuples(transSql);
const transByLocale = {};
// schema unknown; sample first field is locale or spot_slug — peek:
const firstFields = transTuples.length ? splitFields(transTuples[0]) : [];

// --- grid nearest lookup ---
function nearestGrid(lat, lng) {
  let best = null, bestD = Infinity;
  for (const g of grid.points || grid) {
    const dlat = g.lat - lat, dlng = g.lng - lng;
    const d = dlat*dlat + dlng*dlng;
    if (d < bestD) { bestD = d; best = g; }
  }
  return best;
}

const audit = spots.map(s => {
  const nearest = nearestGrid(s.lat, s.lng);
  const photos = json(s.photos_raw);
  const horizon = json(s.horizon_check_raw);
  const warnings = json(s.warnings_raw);
  let issues = [];

  // 1. coords plausible
  if (s.lat < 63.3 || s.lat > 66.6 || s.lng < -24.6 || s.lng > -13.4) issues.push(`coords outside Iceland`);

  // 2. region vs coords
  const r = s.region;
  if (r === 'westfjords' && s.lat < 65.4) issues.push(`region=westfjords but lat=${s.lat}`);
  if (r === 'reykjanes' && s.lat > 64.1) issues.push(`region=reykjanes but lat=${s.lat}`);
  if (r === 'reykjavik' && (s.lat < 64.0 || s.lat > 64.25)) issues.push(`region=reykjavik but lat=${s.lat}`);
  if (r === 'snaefellsnes' && (s.lat < 64.7 || s.lat > 65.2)) issues.push(`region=snaefellsnes but lat=${s.lat}`);
  if (r === 'borgarfjordur' && (s.lat < 64.2 || s.lat > 64.8)) issues.push(`region=borgarfjordur but lat=${s.lat}`);

  // 3. totality duration sanity
  if (s.totality_duration_seconds == null || s.totality_duration_seconds < 0 || s.totality_duration_seconds > 140) {
    issues.push(`totality_duration=${s.totality_duration_seconds}s out of range`);
  }

  // 4. sun alt/az sanity
  if (s.sun_altitude != null && (s.sun_altitude < 23 || s.sun_altitude > 26.5)) issues.push(`sun_alt=${s.sun_altitude}° out of expected 23-26.5°`);
  if (s.sun_azimuth != null && (s.sun_azimuth < 246 || s.sun_azimuth > 254)) issues.push(`sun_az=${s.sun_azimuth}° out of expected 246-254°`);

  // 5. totality_start
  if (!/^2026-08-12[T ]17:4[0-9]/.test(s.totality_start || '')) issues.push(`totality_start=${s.totality_start} not 17:4x UTC`);

  // 6. compare vs nearest grid
  let gridCompare = '';
  if (nearest) {
    const dDur = (s.totality_duration_seconds ?? 0) - (nearest.totality_duration_seconds ?? nearest.duration_seconds ?? 0);
    const dAlt = (s.sun_altitude ?? 0) - (nearest.sun_altitude ?? 0);
    const dAz = (s.sun_azimuth ?? 0) - (nearest.sun_azimuth ?? 0);
    const dKm = haversine(s.lat, s.lng, nearest.lat, nearest.lng);
    gridCompare = `Δdur=${dDur.toFixed(0)}s Δalt=${dAlt.toFixed(2)}° Δaz=${dAz.toFixed(2)}° gridDist=${dKm.toFixed(1)}km`;
    if (Math.abs(dDur) > 30) issues.push(`totality_duration off by ${dDur.toFixed(0)}s vs nearest grid`);
    if (Math.abs(dAlt) > 0.5) issues.push(`sun_altitude off by ${dAlt.toFixed(2)}° vs nearest grid`);
    if (Math.abs(dAz) > 1.5) issues.push(`sun_azimuth off by ${dAz.toFixed(2)}° vs nearest grid`);
  }

  // 7. photos
  const hasHero = Array.isArray(photos) && photos.some(p => p.is_hero);
  if (!Array.isArray(photos) || photos.length === 0) issues.push(`no photos`);
  else if (!hasHero) issues.push(`photos exist but no hero`);
  else {
    const todo = photos.filter(p => /TODO/.test(p.credit || '') || /TODO/.test(p.license || ''));
    if (todo.length) issues.push(`${todo.length} photo(s) with TODO credit/license`);
  }

  // 8. horizon
  if (!horizon || !horizon.verdict) issues.push(`no horizon_check`);
  else if (!['clear','marginal','risky','blocked'].includes(horizon.verdict)) issues.push(`unknown verdict=${horizon.verdict}`);

  // 9. horizon checks file coverage
  if (!horizonSlugs.has(s.slug)) issues.push(`slug missing from seed-horizon-checks.sql`);

  // 10. cell coverage enum
  if (!['good','limited','none'].includes(s.cell_coverage)) issues.push(`cell_coverage=${s.cell_coverage} not in enum`);

  // 11. spot_type enum (canonical from migration 009)
  if (!['drive-up','short-walk','moderate-hike','serious-hike'].includes(s.spot_type)) issues.push(`spot_type=${s.spot_type} not in enum`);

  // 12. trail fields consistency for hikes
  if (/hike/.test(s.spot_type) && (s.trail_distance_km == null || s.trail_time_minutes == null)) issues.push(`${s.spot_type} but trail fields missing`);

  return { ...s, gridCompare, photosLen: Array.isArray(photos)?photos.length:0, horizonVerdict: horizon?.verdict, warningsCount: Array.isArray(warnings)?warnings.length:0, issues };
});

function haversine(a,b,c,d){ const R=6371,toR=x=>x*Math.PI/180; const dLat=toR(c-a),dLng=toR(d-b); const x=Math.sin(dLat/2)**2+Math.cos(toR(a))*Math.cos(toR(c))*Math.sin(dLng/2)**2; return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }

// Sort by region then name
const order = ['westfjords','snaefellsnes','borgarfjordur','reykjavik','reykjanes'];
audit.sort((a,b)=> (order.indexOf(a.region) - order.indexOf(b.region)) || a.name.localeCompare(b.name));

// Output
console.log(`# Spot Audit — ${audit.length} spots\n`);
console.log(`Translation tuples: ${transTuples.length}, first row fields: ${firstFields.length}`);
console.log(`Horizon-check file covers: ${horizonSlugs.size} slugs\n`);

let curRegion = '';
for (const s of audit) {
  if (s.region !== curRegion) { curRegion = s.region; console.log(`\n## ${curRegion.toUpperCase()}\n`); }
  const status = s.issues.length === 0 ? 'OK' : `ISSUES(${s.issues.length})`;
  console.log(`### ${s.name} (${s.slug}) — ${status}`);
  console.log(`  coords: ${s.lat}, ${s.lng}  | type: ${s.spot_type}${s.difficulty?'/'+s.difficulty:''}`);
  console.log(`  totality: ${s.totality_duration_seconds}s @ ${s.totality_start} | sun: ${s.sun_altitude}° alt / ${s.sun_azimuth}° az`);
  console.log(`  grid: ${s.gridCompare}`);
  console.log(`  cell: ${s.cell_coverage} | services: ${s.has_services} | obsHeight: ${s.observer_height_above_ground}`);
  console.log(`  photos: ${s.photosLen} | horizon: ${s.horizonVerdict ?? 'none'} | warnings: ${s.warningsCount}`);
  if (s.issues.length) for (const it of s.issues) console.log(`  ⚠ ${it}`);
  console.log('');
}

// Summary
const allIssues = audit.flatMap(s => s.issues.map(i => ({slug: s.slug, issue: i})));
console.log(`\n## SUMMARY`);
console.log(`Total spots: ${audit.length}`);
console.log(`Clean: ${audit.filter(s=>s.issues.length===0).length}`);
console.log(`With issues: ${audit.filter(s=>s.issues.length>0).length}`);
console.log(`Total issues: ${allIssues.length}`);
const byType = {};
for (const i of allIssues) {
  const key = i.issue.replace(/=[^\s]+/g,'=…').replace(/[\d.]+/g,'N');
  byType[key] = (byType[key]||0)+1;
}
console.log(`\nIssue patterns:`);
for (const [k,v] of Object.entries(byType).sort((a,b)=>b[1]-a[1])) console.log(`  ${v}× ${k}`);
