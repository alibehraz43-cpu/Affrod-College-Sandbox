// Turns whatever text lands in GHL into one of the approved codes.
// GHL never recalculates the result; this only translates labels into codes.
// Anything that doesn't match returns null and the page shows the fallback.

const BAND = ['CRISIS', 'AT_RISK', 'GOOD', 'EXCELLENT'];
const CONCERN = ['TOO_MUCH_FOR_AID', 'RETIREMENT_RISK', 'OVERWHELMED', 'MISSING_SOMETHING'];
const TIMELINE = ['SENIOR', 'JUNIOR', 'SOPH_FRESH', 'MIDDLE_SCHOOL'];

const clean = v => String(v ?? '').trim().toLowerCase();

// Edit these rules once we have the exact ScoreApp answer wording.
// Order matters: first match wins.
const BAND_RULES = [
  [/crisis/, 'CRISIS'],
  [/at[\s_-]*risk/, 'AT_RISK'],
  [/excellent/, 'EXCELLENT'],
  [/good/, 'GOOD'],
];
const CONCERN_RULES = [
  [/retire/, 'RETIREMENT_RISK'],
  [/overwhelm|where to (begin|start)/, 'OVERWHELMED'],
  [/missing|something important/, 'MISSING_SOMETHING'],
  [/too much|financial aid|\baid\b|full price/, 'TOO_MUCH_FOR_AID'],
];
const TIMELINE_RULES = [
  [/middle|[678]th grade|grade [678]\b/, 'MIDDLE_SCHOOL'],
  [/senior|12th|grade 12/, 'SENIOR'],
  [/junior|11th|grade 11/, 'JUNIOR'],
  [/sophomore|freshman|soph|10th|9th|grade (9|10)\b/, 'SOPH_FRESH'],
];

function byRules(value, list, rules) {
  const v = clean(value);
  if (!v) return null;
  const asCode = v.toUpperCase().replace(/[\s-]+/g, '_');
  if (list.includes(asCode)) return asCode;            // already a code
  for (const [re, code] of rules) if (re.test(v)) return code;
  return null;
}

function normalizeScore(value) {
  const n = Number(String(value ?? '').replace(/[^\d.]/g, ''));
  if (!Number.isFinite(n) || String(value ?? '').trim() === '') return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

module.exports = {
  BAND, CONCERN, TIMELINE,
  normalizeBand: v => byRules(v, BAND, BAND_RULES),
  normalizeConcern: v => byRules(v, CONCERN, CONCERN_RULES),
  normalizeTimeline: v => byRules(v, TIMELINE, TIMELINE_RULES),
  normalizeScore,
};
