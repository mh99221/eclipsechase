// Extract INSERT statements for the 8 v3-era spots from production export.
// These were originally seeded by scripts/update-spots-v3.sql (commit 4c7021a, never committed).
import fs from 'node:fs';

const V3_SLUGS = new Set([
  'hellnar-viewpoint',
  'londrangar-malarrif',
  'ondverdarnes-svortuloft',
  'svodufoss-waterfall',
  'ytri-tunga-beach',
  'blue-lagoon',
  'perlan-reykjavik',
  'sky-lagoon',
]);

const sql = fs.readFileSync('scripts/viewing_spots_rows.sql', 'utf8');

// Robust tuple splitter (same as parse-spots-audit.mjs)
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

function splitFields(tuple) {
  const out = [];
  let buf = '', inStr = false, depth = 0;
  for (let i = 0; i < tuple.length; i++) {
    const c = tuple[i];
    if (inStr) {
      if (c === "'") {
        if (tuple[i + 1] === "'") { buf += "'"; i++; }
        else inStr = false;
      } else buf += c;
    } else {
      if (c === "'") inStr = true;
      else if (c === '(') { depth++; buf += c; }
      else if (c === ')') { depth--; buf += c; }
      else if (c === ',' && depth === 0) { out.push(buf.trim()); buf = ''; continue; }
      else buf += c;
    }
    if (c === "'" && inStr === false && tuple[i-1] !== "'") buf += c;
  }
  if (buf.length) out.push(buf.trim());
  return out;
}

const COLS = ['id','name','slug','lat','lng','region','description','parking_info','terrain_notes','has_services','cell_coverage','totality_duration_seconds','totality_start','sun_altitude','sun_azimuth','spot_type','trail_distance_km','trail_time_minutes','difficulty','elevation_gain_m','trailhead_lat','trailhead_lng','photos','horizon_check','warnings','nearby_poi','observer_height_above_ground'];

const tuples = splitTuples(sql);
const matched = [];
for (const t of tuples) {
  const f = splitFields(t);
  // recover quoted strings — splitFields drops the surrounding quotes when present
  // Actually we need a cleaner extraction. Let me redo with a more careful parser.
}

// Better approach: extract field 3 (slug) from raw tuple to filter, then emit raw tuple
const SEP_RE = /,(?=(?:[^']*'[^']*')*[^']*$)/;

const ordered = [];
for (const t of tuples) {
  // count outside-quote commas to extract slug (column index 2 — 0-based)
  let inStr = false, depth = 0, count = 0, slugBuf = '', currentBuf = '', commaIdx = -1;
  let lastCommaPos = -1;
  const positions = [-1]; // positions of unquoted top-level commas
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inStr) {
      if (c === "'") {
        if (t[i+1] === "'") { i++; continue; }
        inStr = false;
      }
    } else {
      if (c === "'") inStr = true;
      else if (c === '(') depth++;
      else if (c === ')') depth--;
      else if (c === ',' && depth === 0) positions.push(i);
    }
  }
  // slug is between positions[2]+1 and positions[3]
  const slugRaw = t.slice(positions[2]+1, positions[3]).trim();
  const slug = slugRaw.slice(1, -1); // strip quotes
  if (V3_SLUGS.has(slug)) {
    ordered.push({ slug, tuple: t });
  }
}

const HEADER = `-- Seed the 8 v3-era viewing spots that landed via the uncommitted
-- scripts/update-spots-v3.sql (commit 4c7021a, Apr 2026). Captured from the
-- live Supabase export so a fresh \`supabase db reset\` no longer loses them.
--
-- Slugs: hellnar-viewpoint, londrangar-malarrif, ondverdarnes-svortuloft,
--        svodufoss-waterfall, ytri-tunga-beach, blue-lagoon, perlan-reykjavik,
--        sky-lagoon
--
-- Generated from scripts/viewing_spots_rows.sql by
-- scripts/internal/extract-v3-spots.mjs — regenerate after exporting a fresh
-- copy of viewing_spots if these rows change in production.

`;

let out = HEADER;
for (const { slug, tuple } of ordered) {
  out += `-- ${slug}\n`;
  out += `INSERT INTO "public"."viewing_spots" (${COLS.map(c=>`"${c}"`).join(', ')}) VALUES (${tuple})\n`;
  out += `ON CONFLICT (id) DO NOTHING;\n\n`;
}

fs.writeFileSync('scripts/migrations/seed-viewing-spots-v3.sql', out);
console.log(`Wrote ${ordered.length} spots to scripts/migrations/seed-viewing-spots-v3.sql`);
for (const { slug } of ordered) console.log(`  - ${slug}`);
const missing = [...V3_SLUGS].filter(s => !ordered.find(o => o.slug === s));
if (missing.length) console.log(`MISSING from export:`, missing);
