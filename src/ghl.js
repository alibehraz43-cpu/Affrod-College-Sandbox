// Thin GHL API v2 client. Token stays server-side.
const cfg = require('./config');

const key = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

async function ghl(path, opts = {}) {
  const res = await fetch(cfg.ghl.base + path, {
    ...opts,
    headers: {
      Authorization: `Bearer ${cfg.ghl.token}`,
      Version: cfg.ghl.version,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`GHL ${res.status} on ${path}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Custom field id lookup, cached for 10 minutes.
let fieldCache = { at: 0, byKey: new Map(), list: [] };
async function customFields() {
  if (Date.now() - fieldCache.at < 10 * 60 * 1000 && fieldCache.list.length) return fieldCache;
  const data = await ghl(`/locations/${cfg.ghl.locationId}/customFields`);
  const list = (data && data.customFields) || [];
  const byKey = new Map();
  for (const f of list) {
    byKey.set(key(f.name), f.id);
    if (f.fieldKey) byKey.set(key(f.fieldKey.replace(/^contact\./, '')), f.id);
  }
  fieldCache = { at: Date.now(), byKey, list };
  return fieldCache;
}

async function fieldId(name) {
  const { byKey } = await customFields();
  return byKey.get(key(name)) || null;
}

async function getContact(contactId) {
  const data = await ghl(`/contacts/${encodeURIComponent(contactId)}`);
  return data && data.contact ? data.contact : null;
}

async function searchOne(filter) {
  const data = await ghl('/contacts/search', {
    method: 'POST',
    body: JSON.stringify({ locationId: cfg.ghl.locationId, page: 1, pageLimit: 1, filters: [filter] }),
  });
  const c = data && data.contacts && data.contacts[0];
  return c ? getContact(c.id) : null; // re-read for full custom fields
}

async function findByCustomField(name, value) {
  const id = await fieldId(name);
  if (!id) throw new Error(`Custom field "${name}" not found in GHL`);
  return searchOne({ field: `customFields.${id}`, operator: 'eq', value });
}

async function findByEmail(email) {
  return searchOne({ field: 'email', operator: 'eq', value: email });
}

async function readField(contact, name) {
  const id = await fieldId(name);
  if (!id || !contact || !Array.isArray(contact.customFields)) return null;
  const hit = contact.customFields.find(f => f.id === id);
  if (!hit) return null;
  return hit.value ?? hit.field_value ?? hit.fieldValue ?? null;
}

module.exports = { getContact, findByCustomField, findByEmail, readField, customFields };
