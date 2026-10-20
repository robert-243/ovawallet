const express = require('express');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const app = express();
app.use(express.json());

const fixieUrl = process.env.FIXIE_URL;
const httpsAgent = fixieUrl ? new HttpsProxyAgent(fixieUrl) : null;

app.post('/pay', async (req, res) => {
  try {
    const response = await axios.post('https://api.saspay.net/v1/payments', req.body, {
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
  res.send('Proxy OVAWALLET - Fixie actif');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Proxy relais actif sur le port ' + PORT);
});
