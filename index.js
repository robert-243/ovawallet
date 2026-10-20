const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

// Configuration du proxy Fixie
const fixieUrl = process.env.FIXIE_URL ? process.env.FIXIE_URL.trim() : null;
let httpsAgent = null;

if (fixieUrl) {
  try {
    httpsAgent = new HttpsProxyAgent(fixieUrl);
    console.log('Proxy Fixie actif');
  } catch (err) {
    console.error('Erreur Fixie:', err.message);
  }
}

// Endpoint pour le Checkout SasPay
app.post('/pay', async (req, res) => {
  try {
    const response = await axios.post('https://api.saspay.me/api/v1/checkout-sessions/', req.body, {
      httpsAgent,
      httpAgent: httpsAgent,
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
