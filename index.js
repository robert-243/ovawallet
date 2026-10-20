const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

// Récupération propre de l'URL Fixie
const fixieUrl = process.env.FIXIE_URL ? process.env.FIXIE_URL.trim() : null;

// Initialisation de l'agent proxy HTTPS standard
const httpsAgent = fixieUrl ? new HttpsProxyAgent(fixieUrl) : null;

// Endpoint pour le Checkout SasPay
app.post('/pay', async (req, res) => {
  try {
    const response = await axios.post('https://api.saspay.me/api/v1/checkout-sessions/', req.body, {
      httpsAgent,
      proxy: false, // Désactive le proxy axios natif pour laisser HttpsProxyAgent gérer le tunnel
      headers: {
        'Content-Type': 'application/json',
        ...req.headers
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
app.listen(PORT, () => console.log('Serveur démarré sur le port ' + PORT));
