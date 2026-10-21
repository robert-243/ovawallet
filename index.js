const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

// Extraction et nettoyage de l'URL Fixie
let rawFixie = process.env.FIXIE_URL || '';
let cleanFixie = rawFixie.replace(/[\[\]'"\s]/g, '');

let httpsAgent = null;
if (cleanFixie) {
  try {
    httpsAgent = new HttpsProxyAgent(cleanFixie);
    console.log('Proxy Fixie initialisé.');
  } catch (err) {
    console.error('Erreur Fixie:', err.message);
  }
}

// Helper pour préparer les headers de transmission
const getHeaders = (req) => {
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
  
  // Transmettre l'en-tête Authorization s'il est présent
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  
  return headers;
};

// 1. Endpoint pour les DÉPÔTS (Checkout Sessions)
app.post('/pay', async (req, res) => {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.saspay.me/api/v1/checkout-sessions/',
      data: req.body,
      httpsAgent: httpsAgent,
      proxy: false,
      headers: getHeaders(req)
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// 2. Endpoint pour les RETRAITS (Payouts)
app.post('/payout', async (req, res) => {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.saspay.me/api/v1/payouts/',
      data: req.body,
      httpsAgent: httpsAgent,
      proxy: false,
      headers: getHeaders(req)
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Proxy OVAWALLET - Relay actif (Pay & Payout)');
  // Dans le serveur Express du relais Render (à côté de la route /pay existante)
const { HttpsProxyAgent } = require("https-proxy-agent");
const agent = new HttpsProxyAgent(process.env.FIXIE_URL); // déjà utilisé pour /pay
const SASPAY = "https://api.saspay.me/api/v1";

async function forward(req, res, method, path) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer sk_")) return res.status(401).json({ error: "missing key" });
  try {
    const r = await fetch(`${SASPAY}${path}`, {
      method,
      headers: { Authorization: auth, Accept: "application/json", ...(method === "POST" ? { "Content-Type": "application/json" } : {}) },
      body: method === "POST" ? JSON.stringify(req.body) : undefined,
      dispatcher: agent, // ou `agent` selon votre client HTTP (axios: httpsAgent: agent)
      redirect: "manual",
    });
    res.status(r.status).type("application/json").send(await r.text());
  } catch (e) {
    res.status(502).json({ error: "relay upstream error" });
  }
}

// Envoi d'un retrait (jamais relancé automatiquement)
app.post("/payouts", (req, res) => forward(req, res, "POST", "/payouts/initialize/"));

// Vérification du statut d'un retrait
app.get("/payouts/:id/verify", (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return res.status(400).json({ error: "bad id" });
  forward(req, res, "GET", `/payouts/${req.params.id}/verify/`);
});

// Vérification d'un dépôt (pour confirmer automatiquement les dépôts)
app.get("/payments/:id/verify", (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return res.status(400).json({ error: "bad id" });
  forward(req, res, "GET", `/payments/${req.params.id}/verify/`);
});
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serveur proxy actif sur ' + PORT));
