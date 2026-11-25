const express = require('express');
const cfg = require('./config');
const ghl = require('./ghl');
const N = require('./normalize');

const app = express();
app.disable('x-powered-by');

// ---- CORS: only the GHL funnel domain(s) may call this ----
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && cfg.allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ---- Very small rate limit: 30 requests / minute / IP ----
const hits = new Map();
app.use('/api', (req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip;
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > 60000) { rec.n = 0; rec.t = now; }
  rec.n += 1; hits.set(ip, rec);
  if (rec.n > 30) return res.status(429).json({ status: 'rate_limited' });
  next();
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ID_RE = /^[A-Za-z0-9_-]{4,64}$/;
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;

async function findContact(rid) {
  switch (cfg.lookupMode) {
    case 'contact_id':
      if (!ID_RE.test(rid)) return { error: 'bad_id' };
      return { contact: await ghl.getContact(rid) };
    case 'field':
      if (!ID_RE.test(rid)) return { error: 'bad_id' };
      return { contact: await ghl.findByCustomField(cfg.lookupFieldName, rid) };
    case 'email':
      if (!cfg.allowEmailLookup) return { error: 'email_lookup_disabled' };
      if (!EMAIL_RE.test(rid)) return { error: 'bad_id' };
      return { contact: await ghl.findByEmail(rid.toLowerCase()) };
    default:
      return { error: 'bad_lookup_mode' };
  }
}

async function readResult(contact) {
  const [score, band, concern, timeline] = await Promise.all([
    ghl.readField(contact, cfg.fields.score),
    ghl.readField(contact, cfg.fields.band),
    ghl.readField(contact, cfg.fields.concern),
    ghl.readField(contact, cfg.fields.timeline),
  ]);
  return {
    firstName: (contact.firstName || '').slice(0, 40) || null,
    score: N.normalizeScore(score),
    band: N.normalizeBand(band),
    concern: N.normalizeConcern(concern),
    timeline: N.normalizeTimeline(timeline),
  };
}

// GET /api/bridge?rid=...
// Returns ONLY display values. Never email, phone or financial answers.
app.get('/api/bridge', async (req, res) => {
  const rid = String(req.query.rid || '').trim();
  if (!rid) return res.status(400).json({ status: 'missing_id' });

  try {
    let result = null;
    for (let i = 0; i < cfg.retryAttempts; i++) {
      const { contact, error } = await findContact(rid);
      if (error) return res.status(400).json({ status: error });
      if (contact) {
        result = await readResult(contact);
        if (result.band) break; // connector has written the result
      }
      if (i < cfg.retryAttempts - 1) await sleep(cfg.retryDelayMs);
    }

    if (!result) return res.status(404).json({ status: 'not_found' });

    const complete = !!(result.band && result.concern && result.timeline);
    const missing = ['band', 'concern', 'timeline'].filter(k => !result[k]);
    if (!complete) console.warn(`[bridge] partial result rid=${rid.slice(0, 6)}… missing=${missing.join(',')}`);

    res.json({
      status: complete ? 'ok' : 'partial',
      missing,
      ...result,
      segmentKey: complete ? `${result.concern}-${result.band}-${result.timeline}` : null,
    });
  } catch (err) {
    console.error('[bridge] error', err.message);
    res.status(502).json({ status: 'upstream_error' });
  }
});

// Admin helper: lists GHL custom field names + ids so you can confirm the names.
app.get('/admin/fields', async (req, res) => {
  if (!cfg.adminKey || req.headers['x-admin-key'] !== cfg.adminKey) return res.sendStatus(401);
  try {
    const { list } = await ghl.customFields();
    res.json(list.map(f => ({ name: f.name, fieldKey: f.fieldKey, id: f.id, type: f.dataType })));
  } catch (err) { res.status(502).json({ error: err.message }); }
});

app.get('/health', (req, res) => res.json({
  ok: true,
  lookupMode: cfg.lookupMode,
  configured: !!(cfg.ghl.token && cfg.ghl.locationId),
}));

app.listen(cfg.port, () => console.log(`ac-bridge-handoff listening on ${cfg.port} (mode=${cfg.lookupMode})`));
