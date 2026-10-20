const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

// Extraction et nettoyage de l'URL Fixie
let rawFixie = process.env.FIXIE_URL || '';
let cleanFixie = rawFixie.replace(/[\[\]'"\s]/g, '');

// Configuration de l'agent proxy en mode Tunnel CONNECT HTTPS
let httpsAgent = null;

if (cleanFixie) {
  try {
    // URL exacte de destination pour forcer le tunnel SSL vers SasPay
    httpsAgent = new HttpsProxyAgent(cleanFixie);
  } catch (err) {
    console.error('Erreur Fixie:', err.message);
  }
}

// Endpoint pour SasPay Checkout
app.post('/pay', async (req, res) => {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.saspay.me/api/v1/checkout-sessions/',
      data: req.body,
      httpsAgent: httpsAgent,
      proxy: false, // Force axios à utiliser l'httpsAgent (tunnel CONNECT)
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    res.status(response.status).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/', (req, res) => {
  res.send('Proxy OVAWALLET - Relay actif');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Serveur proxy actif sur le port ' + PORT));
