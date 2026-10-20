const express = require('express');
const axios = require('axios');
const https = require('https');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

// Configuration de l'agent HTTPS pour ignorer les erreurs de certificat SSL (self-signed)
const fixieUrl = process.env.FIXIE_URL ? process.env.FIXIE_URL.trim() : null;

let customHttpsAgent;

if (fixieUrl) {
  try {
    customHttpsAgent = new HttpsProxyAgent(fixieUrl, {
      rejectUnauthorized: false
    });
    console.log('Proxy Fixie configuré avec SSL tolérant');
  } catch (err) {
    console.error('Erreur Fixie:', err.message);
  }
} else {
  customHttpsAgent = new https.Agent({
    rejectUnauthorized: false
  });
}

// Endpoint pour le Checkout SasPay
app.post('/pay', async (req, res) => {
  try {
    const response = await axios.post('https://api.saspay.me/api/v1/checkout-sessions/', req.body, {
      httpsAgent: customHttpsAgent,
      httpAgent: customHttpsAgent,
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
