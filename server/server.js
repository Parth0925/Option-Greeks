// server/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

// Caching setup
let lastRequestTime = 0;
let cachedResponse = null;
let isFetching = false;
const CACHE_DURATION_MS = 3100;

// Option Chain Endpoint
app.post('/api/optionchain', async (req, res) => {
  const now = Date.now();
  const { UnderlyingScrip, UnderlyingSeg, Expiry } = req.body;

  if (cachedResponse && now - lastRequestTime < CACHE_DURATION_MS) {
    console.log('⏱️ Serving cached response');
    return res.json(cachedResponse);
  }

  if (isFetching) {
    console.log('🔁 Already fetching. Serving last known cache.');
    return res.json(cachedResponse || { message: 'Data is being fetched' });
  }

  try {
    isFetching = true;
    console.log('🚀 Fetching fresh data from Dhan API...');

    const response = await axios.post(
      'https://api.dhan.co/v2/optionchain',
      { UnderlyingScrip, UnderlyingSeg, Expiry },
      {
        headers: {
          'access-token': process.env.REACT_APP_ACCESS_TOKEN,
          'client-id': process.env.REACT_APP_CLIENT_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    lastRequestTime = Date.now();
    cachedResponse = response.data;

    console.log('✅ Fetched fresh data from Dhan');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from Dhan API:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch from Dhan API',
      details: error.response?.data || error.message,
    });
  } finally {
    isFetching = false;
  }
});

// Expiry List Endpoint
app.post('/api/expirylist', async (req, res) => {
  const { UnderlyingScrip, UnderlyingSeg } = req.body;

  try {
    const response = await axios.post(
      'https://api.dhan.co/v2/optionchain/expirylist',
      { UnderlyingScrip, UnderlyingSeg },
      {
        headers: {
          'access-token': process.env.REACT_APP_ACCESS_TOKEN,
          'client-id': process.env.REACT_APP_CLIENT_ID,
          'Content-Type': 'application/json',
        },
      }
    );

    res.json(response.data); // returns { data: [ ...dates ] }
  } catch (error) {
    console.error('Error fetching expiry list from Dhan API:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to fetch expiry list from Dhan API',
      details: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});