#!/usr/bin/env node
/**
 * refresh.js — Pull fresh entries from Horse Racing Nation and inject
 * them into data.json + index.html (the embedded RACE_DATA constant).
 *
 * Preserves your handicapping work: per-horse modelAdj, notes, pace,
 * expertPicks, and per-race notes are kept when the same horse (matched
 * by post + name) appears in the new pull. New horses get modelAdj=1.0.
 *
 * Usage:
 *   node refresh.js                                 # default: Churchill, today
 *   node refresh.js churchill-downs 2026-05-02      # explicit
 *
 * Requires Node 18+ for built-in fetch.
 */

const fs = require('fs');
const path = require('path');

const TRACK = process.argv[2] || process.env.DERBY_TRACK || 'churchill-downs';
const DATE  = process.argv[3] || process.env.DERBY_DATE  || '2026-05-02';
const URL   = `https://entries.horseracingnation.com/entries-results/${TRACK}/${DATE}`;
const HERE  = process.env.DERBY_OUT_DIR ? path.resolve(process.env.DERBY_OUT_DIR) : __dirname;
const FAIL_SOFT = process.env.CI === 'true';

// Guard: in CI, skip silently after the event so we don't churn forever.
const today = new Date().toISOString().slice(0, 10);
if (FAIL_SOFT && today > DATE) {
  console.log(`Today (${today}) is past event date (${DATE}). Refresh skipped — data frozen.`);
  process.exit(0);
}

const STAKES_HINT = /(stakes|kentucky derby|distaff|turf classic|pat day mile|knicks go|twin spires|american turf|churchill downs)/i;
const GRADE_RE    = /(grade\s*([1-3]|i{1,3})|listed)/i;

// Manual overrides — HRN scratch column is unreliable for the Derby specifically.
// Source of truth: https://www.kentuckyderby.com/derby-horses/
const SCRATCH_OVERRIDES = {
  12: ['Right to Party', 'The Puma', 'Silent Tactic', 'Fulleffort']  // Derby scratches per official KY Derby site
};

async function main() {
  console.log(`Fetching ${URL} ...`);
  const res = await fetch(URL, { headers: { 'User-Agent': 'Mozilla/5.0 derby-companion/1.0' } });
  if (!res.ok) throw new Error(`HRN returned ${res.status}`);
  const html = await res.text();
  console.log(`Got ${(html.length / 1024).toFixed(0)}KB of HTML`);

  const races = parseRaces(html);
  if (!races.length) throw new Error('Parsed 0 races. HRN HTML structure may have changed.');
  console.log(`Parsed ${races.length} races`);

  // Merge with existing data.json (preserve modelAdj, notes, pace, expertPicks)
  const dataPath = path.join(HERE, 'data.json');
  const existing = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, 'utf8')) : null;
  const merged = mergeWithExisting(races, existing);

  // Write data.json
  fs.writeFileSync(dataPath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`✓ Wrote data.json (${merged.races.length} races, ${merged.races.reduce((s,r)=>s+r.field.length,0)} entries)`);

  // Inject into index.html embedded RACE_DATA
  const htmlPath = path.join(HERE, 'index.html');
  if (fs.existsSync(htmlPath)) {
    const minimal = { meta: merged.meta, races: merged.races };
    const injected = `const RACE_DATA = ${JSON.stringify(minimal, null, 2)};`;
    let pageHtml = fs.readFileSync(htmlPath, 'utf8');
    const re = /const RACE_DATA = \{[\s\S]*?^\};/m;
    if (!re.test(pageHtml)) throw new Error('Could not find RACE_DATA block in index.html');
    pageHtml = pageHtml.replace(re, injected);
    fs.writeFileSync(htmlPath, pageHtml);
    console.log(`✓ Injected into index.html`);
  }

  // Summary of changes vs. existing
  if (existing) {
    summarizeChanges(existing.races, merged.races);
  }
}

function parseRaces(html) {
  const races = [];
  // Each race block starts at <a class="race-header" id="race-N"> and ends before the next.
  const headerRe = /<a class="race-header" id="race-(\d+)">([\s\S]*?)<\/a>/g;
  const matches = [...html.matchAll(headerRe)];

  for (let i = 0; i < matches.length; i++) {
    const raceNum = parseInt(matches[i][1]);
    const headerInner = matches[i][2];
    const blockStart = matches[i].index;
    const blockEnd = i + 1 < matches.length ? matches[i + 1].index : html.length;
    const block = html.slice(blockStart, blockEnd);

    // Post time — use track-local from the title attribute
    let postTime = '';
    const ptMatch = headerInner.match(/title="([^"]*?Track Local Time)"/);
    if (ptMatch) postTime = ptMatch[1].replace(/\s*Track Local Time$/, '').trim();
    else {
      const ptText = headerInner.match(/<time[^>]*>([\s\S]*?)<\/time>/);
      if (ptText) postTime = ptText[1].trim();
    }

    // Distance / surface / conditions: 3 lines inside class="race-distance"
    let distance = '', surface = '', conditions = '';
    const distMatch = block.match(/class="[^"]*race-distance[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    if (distMatch) {
      const lines = distMatch[1].split(/,\s*/).map(s => s.replace(/<[^>]+>/g, '').trim()).filter(Boolean);
      [distance, surface, conditions] = lines;
    }
    const purseMatch = block.match(/Purse:\s*\$([\d,]+)/);
    const purse = purseMatch ? parseInt(purseMatch[1].replace(/,/g, '')) : null;
    const restrictMatch = block.match(/class="[^"]*race-restrictions[^"]*"[^>]*>([\s\S]*?)<\/div>/);
    const age = restrictMatch ? cleanText(restrictMatch[1]) : '';

    // Race name and grade
    let name = conditions || `Race ${raceNum}`;
    let grade = null;
    const gradeMatch = (conditions || '').match(GRADE_RE);
    if (gradeMatch) {
      const g = gradeMatch[1].toLowerCase();
      if (g.includes('listed')) grade = 'Listed';
      else if (g.includes('1') || g === 'i')   grade = 'G1';
      else if (g.includes('2') || g === 'ii')  grade = 'G2';
      else if (g.includes('3') || g === 'iii') grade = 'G3';
    }
    if (STAKES_HINT.test(conditions || '')) {
      name = (conditions || '').replace(/\s*-\s*Grade\s*[1-3iI]+/i, '').replace(/\s*Listed/i, '').replace(/\s*Stakes?\s*$/i, '').trim() || name;
    }

    // Horse rows
    const field = parseHorses(block);

    // Apply manual scratch overrides (HRN doesn't always reflect day-of scratches)
    const overrides = SCRATCH_OVERRIDES[raceNum] || [];
    for (const scrName of overrides) {
      const horse = field.find(h => h.name.toLowerCase().includes(scrName.toLowerCase()));
      if (horse && !horse.scratched) {
        horse.scratched = true;
        horse.notes = `SCRATCHED (per official source). ${horse.notes || ''}`.trim();
      }
    }

    races.push({
      raceNum, postTime, name, grade, purse,
      distance: distance || 'TBD',
      surface: surface || 'TBD',
      age: age || 'TBD',
      field,
      pace: '', expertPicks: [], notes: ''
    });
  }
  return races;
}

function parseHorses(block) {
  const horses = [];
  // Each row starts at <tr ...> and contains the data-label cells
  const rowRe = /<tr[^>]*class="[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
  for (const rm of block.matchAll(rowRe)) {
    const row = rm[1];
    if (!/data-label="Post Position"/.test(row)) continue;
    const post = takeText(row, /data-label="Post Position"[^>]*>([\s\S]*?)<\/td>/);
    // Horse name: try the link first, then fall back to the h4 contents (some entries lack the link)
    let name = takeText(row, /class="horse-link"[^>]*>([\s\S]*?)<\/a>/);
    if (!name) {
      const h4 = row.match(/data-label="Horse \/ Sire"[\s\S]*?<h4>([\s\S]*?)<\/h4>/);
      if (h4) name = cleanText(h4[1].replace(/<span[^>]*>[\s\S]*?<\/span>/g, ''));
    }
    if (!post || !name) continue;
    const trJk = row.match(/data-label="Trainer \/ Jockey"[\s\S]*?<\/td>/);
    let trainer = '', jockey = '';
    if (trJk) {
      const ps = [...trJk[0].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => cleanText(m[1]));
      [trainer, jockey] = [ps[0] || '', ps[1] || ''];
    }
    const ml = takeText(row, /data-label="Morning Line Odds"[\s\S]*?<p>([\s\S]*?)<\/p>/) || '';
    const scrCell = cleanText((row.match(/data-label="Scratched\?"[^>]*>([\s\S]*?)<\/td>/) || [, ''])[1]);
    // Distinguish a real scratch from "Also-eligible" (AE = entry that may run if scratches occur)
    const isAE = /also[-\s]?eligible|^AE\b/i.test(scrCell);
    const scratched = (!isAE && /scratch|^scr|withdrew/i.test(scrCell)) || /^scr/i.test(ml);
    horses.push({
      post: /^\d+$/.test(post) ? parseInt(post) : post,
      name: cleanText(name),
      jockey,
      trainer,
      mlOdds: ml.replace('/', '-'),
      modelAdj: 1.0,
      notes: isAE ? 'Also-eligible — only runs if scratches occur.' : '',
      ...(scratched ? { scratched: true } : {}),
      ...(isAE ? { ae: true } : {})
    });
  }
  return horses;
}

function takeText(html, re) {
  const m = html.match(re);
  return m ? cleanText(m[1]) : '';
}
function cleanText(s) {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ').trim();
}

function mergeWithExisting(newRaces, existing) {
  const meta = {
    track: existing?.meta?.track || 'Churchill Downs',
    date: DATE,
    event: existing?.meta?.event || `Card for ${DATE}`,
    lastUpdated: new Date().toISOString(),
    primarySource: URL
  };
  if (!existing) {
    return { meta, settings: { kellyMultiplier: 0.25, minEdgePct: 5, defaultBankroll: 500 }, races: newRaces };
  }
  const oldByNum = new Map(existing.races.map(r => [r.raceNum, r]));
  const races = newRaces.map(nr => {
    const old = oldByNum.get(nr.raceNum);
    if (!old) return nr;
    // Preserve race-level handicapping
    const merged = { ...nr, pace: old.pace || nr.pace, expertPicks: old.expertPicks?.length ? old.expertPicks : nr.expertPicks, notes: old.notes || nr.notes, name: old.name && old.name !== `Race ${nr.raceNum}` ? old.name : nr.name };
    // Preserve per-horse modelAdj + notes (match by post then by name)
    const oldByPost = new Map(old.field.map(h => [String(h.post), h]));
    const oldByName = new Map(old.field.map(h => [h.name.toLowerCase(), h]));
    merged.field = nr.field.map(h => {
      const prior = oldByPost.get(String(h.post)) || oldByName.get(h.name.toLowerCase());
      if (!prior) return h;
      return { ...h, modelAdj: prior.modelAdj ?? 1.0, notes: prior.notes || h.notes };
    });
    return merged;
  });
  return { meta, settings: existing.settings || { kellyMultiplier: 0.25, minEdgePct: 5, defaultBankroll: 500 }, races };
}

function summarizeChanges(oldRaces, newRaces) {
  console.log('\n=== Changes since last refresh ===');
  let any = false;
  for (const nr of newRaces) {
    const or = oldRaces.find(r => r.raceNum === nr.raceNum);
    if (!or) { console.log(`  R${nr.raceNum}: NEW race`); any = true; continue; }
    const newScr = nr.field.filter(h => h.scratched && !or.field.find(o => String(o.post) === String(h.post) && o.scratched));
    const newAdded = nr.field.filter(h => !or.field.find(o => String(o.post) === String(h.post)));
    const newOddsHorses = nr.field.filter(h => {
      const prev = or.field.find(o => String(o.post) === String(h.post));
      return prev && prev.mlOdds && h.mlOdds && prev.mlOdds !== h.mlOdds;
    });
    if (newScr.length || newAdded.length || newOddsHorses.length) {
      any = true;
      console.log(`  R${nr.raceNum} ${nr.name}:`);
      newScr.forEach(h => console.log(`    SCR  #${h.post} ${h.name}`));
      newAdded.forEach(h => console.log(`    ADD  #${h.post} ${h.name} (${h.mlOdds})`));
      newOddsHorses.forEach(h => {
        const prev = or.field.find(o => String(o.post) === String(h.post));
        console.log(`    ML   #${h.post} ${h.name}: ${prev.mlOdds} → ${h.mlOdds}`);
      });
    }
  }
  if (!any) console.log('  (no changes)');
}

main().catch(e => {
  console.error('FAIL:', e.message);
  // In CI, exit 0 so a transient HRN error doesn't break the whole site deploy.
  process.exit(FAIL_SOFT ? 0 : 1);
});
