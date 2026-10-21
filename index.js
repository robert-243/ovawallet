'use strict';

const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
const SASPAY = 'https://api.saspay.me/api/v1';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const fixieUrl = (process.env.FIXIE_URL || '')
  .trim()
  .replace(/^[\[\]'"\s]+|[\[\]'"\s]+$/g, '');

let httpsAgent = null;

if (fixieUrl) {
  try {
    const parsed = new URL(fixieUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('invalid protocol');
    }
    httpsAgent = new HttpsProxyAgent(fixieUrl);
  } catch {
    console.error('Configuration Fixie invalide : vérifier FIXIE_URL dans Render.');
  }
}

app.disable('x-powered-by');
app.use(express.json({
  limit: '256kb',
  verify: (req, _res, buffer) => {
    req.rawBody = Buffer.from(buffer);
  },
}));

function getHeaders(req) {
  return {
    Authorization: req.headers.authorization,
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(req.headers['idempotency-key']
      ? { 'Idempotency-Key': req.headers['idempotency-key'] }
      : {}),
  };
}

async function forward(req, res, method, path) {
  const auth = req.headers.authorization;

  if (typeof auth !== 'string' || !auth.startsWith('Bearer sk_')) {
    return res.status(401).json({ error: 'missing key' });
  }

  // Ne jamais contourner Fixie ni désactiver la validation TLS.
  if (!httpsAgent) {
    return res.status(503).json({ error: 'Fixie is not configured' });
  }

  try {
    const response = await axios({
      method,
      url: `${SASPAY}${path}`,
      ...(method === 'POST'
        ? { data: req.rawBody || JSON.stringify(req.body) }
        : {}),
      httpsAgent,
      proxy: false,
      headers: getHeaders(req),
      timeout: 60000,
      maxRedirects: 0,
      validateStatus: () => true,
      responseType: 'arraybuffer',
      // Aucun renvoi automatique des demandes de paiement.
    });

    if (response.status >= 300 && response.status < 400) {
      return res.status(502).json({
        error: 'upstream redirect blocked; outcome unconfirmed',
      });
    }

    res.status(response.status);
    const contentType = response.headers?.['content-type'];
    if (contentType) res.set('Content-Type', contentType);
    return res.send(Buffer.from(response.data));
  } catch (error) {
    const timeout = error.code === 'ECONNABORTED'
      || error.code === 'ETIMEDOUT';

    console.error(
      `Relais : ${timeout ? 'délai dépassé' : 'connexion amont impossible'} ; ne pas renvoyer automatiquement.`
    );

    return res.status(timeout ? 504 : 502).json({
      error: timeout
        ? 'upstream timeout; outcome unconfirmed'
        : 'upstream connection failed; outcome unconfirmed',
    });
  }
}

// DÉPÔTS : adresse existante conservée.
app.post('/pay', (req, res) =>
  forward(req, res, 'POST', '/checkout-sessions/')
);

// RETRAITS : route utilisée par OVAFAST.
app.post('/payouts', (req, res) =>
  forward(req, res, 'POST', '/payouts/initialize/')
);

// Compatibilité avec l'ancienne adresse au singulier.
app.post('/payout', (req, res) =>
  forward(req, res, 'POST', '/payouts/initialize/')
);

// Vérification des retraits.
app.get('/payouts/:id/verify', (req, res) => {
  if (!UUID.test(req.params.id)) {
    return res.status(400).json({ error: 'bad id' });
  }
  return forward(req, res, 'GET', `/payouts/${req.params.id}/verify/`);
});

// Vérification des dépôts.
app.get('/payments/:id/verify', (req, res) => {
  if (!UUID.test(req.params.id)) {
    return res.status(400).json({ error: 'bad id' });
  }
  return forward(req, res, 'GET', `/payments/${req.params.id}/verify/`);
});

app.get('/', (_req, res) => {
  res.send('OVAFAST — relais actif (dépôts et retraits)');
});

app.use((error, _req, res, _next) => {
  const status = error.type === 'entity.too.large' ? 413 : 400;
  res.status(status).json({
    error: status === 413 ? 'request too large' : 'invalid JSON',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Relais OVAFAST actif sur ${PORT}`);
});
