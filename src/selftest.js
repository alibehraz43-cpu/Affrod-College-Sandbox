// Offline check of the label -> code rules. Run: npm test
const N = require('./normalize');
const cases = [
  ['normalizeBand', 'Excellent Position', 'EXCELLENT'],
  ['normalizeBand', 'Good Position', 'GOOD'],
  ['normalizeBand', 'At Risk', 'AT_RISK'],
  ['normalizeBand', 'Crisis Mode', 'CRISIS'],
  ['normalizeBand', 'banana', null],
  ['normalizeConcern', 'RETIREMENT_RISK', 'RETIREMENT_RISK'],
  ['normalizeConcern', 'Worried about sacrificing retirement', 'RETIREMENT_RISK'],
  ['normalizeConcern', 'We make too much for financial aid', 'TOO_MUCH_FOR_AID'],
  ['normalizeConcern', 'Overwhelmed and not sure where to begin', 'OVERWHELMED'],
  ['normalizeConcern', 'Afraid we are missing something', 'MISSING_SOMETHING'],
  ['normalizeTimeline', 'Junior (11th grade)', 'JUNIOR'],
  ['normalizeTimeline', 'Senior', 'SENIOR'],
  ['normalizeTimeline', 'Freshman or Sophomore', 'SOPH_FRESH'],
  ['normalizeTimeline', 'Middle school', 'MIDDLE_SCHOOL'],
  ['normalizeScore', '80', 80],
  ['normalizeScore', '', null],
];
let fail = 0;
for (const [fn, input, want] of cases) {
  const got = N[fn](input);
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${fn}(${JSON.stringify(input)}) = ${JSON.stringify(got)}${ok ? '' : ` (want ${JSON.stringify(want)})`}`);
}
process.exit(fail ? 1 : 0);
