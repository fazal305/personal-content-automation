// Simple shared-secret auth. This is a single-user, localhost-bound tool that
// holds real publishing credentials for connected platforms, so every route
// except /health requires a matching X-API-Key header. Not a full auth
// system by design — see .env.example for how to set API_KEY.
export function apiKeyAuth(req, res, next) {
  const expected = process.env.API_KEY;

  if (!expected) {
    // Fail closed: an unset API_KEY means the server is misconfigured, not open.
    return res.status(500).json({ error: 'server_misconfigured', message: 'API_KEY is not set on the server — see .env.example.' });
  }

  const provided = req.get('X-API-Key');
  if (provided !== expected) {
    return res.status(401).json({ error: 'unauthorized', message: 'Invalid or missing API key — check your .env.' });
  }

  next();
}
