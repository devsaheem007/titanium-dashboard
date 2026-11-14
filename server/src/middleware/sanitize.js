// Removes keys such as "$gt" or "a.b" from user input to stop NoSQL operator injection
// (e.g. { "email": { "$gt": "" } } on a login form).
function clean(value) {
  if (Array.isArray(value)) return value.map(clean);
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) continue;
      out[key] = clean(val);
    }
    return out;
  }
  return value;
}

export function sanitize(req, _res, next) {
  if (req.body) req.body = clean(req.body);
  if (req.query) req.query = clean(req.query);
  if (req.params) req.params = clean(req.params);
  next();
}
