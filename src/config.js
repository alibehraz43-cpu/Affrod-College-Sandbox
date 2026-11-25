// All settings come from environment variables (Railway Variables tab).
const env = (k, d) => (process.env[k] ?? d);

module.exports = {
  port: Number(env('PORT', 3000)),
  ghl: {
    token: env('GHL_API_TOKEN', ''),
    locationId: env('GHL_LOCATION_ID', ''),
    base: 'https://services.leadconnectorhq.com',
    version: '2021-07-28',
  },
  lookupMode: env('LOOKUP_MODE', 'field'),
  lookupFieldName: env('LOOKUP_FIELD_NAME', 'ScoreApp-AC-Response-ID'),
  allowEmailLookup: env('ALLOW_EMAIL_LOOKUP', 'false') === 'true',
  fields: {
    score: env('FIELD_SCORE', 'ScoreApp-AC-Total-Score'),
    band: env('FIELD_BAND', 'ScoreApp-AC-Category-Score-Tier'),
    concern: env('FIELD_CONCERN', 'ScoreApp-AC-Concern-Code'),
    timeline: env('FIELD_TIMELINE', 'ScoreApp-AC-Timeline-Code'),
  },
  retryAttempts: Number(env('RETRY_ATTEMPTS', 5)),
  retryDelayMs: Number(env('RETRY_DELAY_MS', 1500)),
  allowedOrigins: env('ALLOWED_ORIGINS', '').split(',').map(s => s.trim()).filter(Boolean),
  adminKey: env('ADMIN_KEY', ''),
};
