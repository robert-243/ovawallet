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
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serveur proxy actif sur ' + PORT));
