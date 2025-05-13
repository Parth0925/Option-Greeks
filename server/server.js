// server/server.js
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({
  origin: 'https://68231950d8e5c42aca4651b6--majestic-sundae-4485a3.netlify.app',
  credentials: true
}));
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
          'access-token': process.env.ACCESS_TOKEN,
          'client-id': process.env.CLIENT_ID,
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
          'access-token': process.env.ACCESS_TOKEN,
          'client-id': process.env.CLIENT_ID,
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

//excel display

app.get('/api/optionchain/json', async (req, res) => {
  const { UnderlyingScrip, UnderlyingSeg, Expiry } = req.query;


  try {
    const response = await axios.post(
      'https://api.dhan.co/v2/optionchain',
      { UnderlyingScrip, UnderlyingSeg, Expiry },
      {
        headers: {
          'access-token': process.env.ACCESS_TOKEN,
          'client-id': process.env.CLIENT_ID,
          'Content-Type': 'application/json',
        },
      }
    );

        const data = response.data.data; // Assuming data is under 'data' field

    // Start building the HTML table
    let html = '<html><body><table border="1"><thead><tr><th>CE Vega</th><th>CE Delta</th><th>CE Theta</th><th>Strike</th><th>PE Theta</th><th>PE Delta</th><th>PE Vega</th></tr></thead><tbody>';

    Object.entries(data.oc).forEach(([strike, option]) => {
      html += `
        <tr>
          <td>${parseFloat(option.ce?.greeks?.vega).toFixed(4)}</td>
          <td>${parseFloat(option.ce?.greeks?.delta).toFixed(4)}</td>
          <td>${parseFloat(option.ce?.greeks?.theta).toFixed(4)}</td>
          <td>${strike}</td>
          <td>${parseFloat(option.pe?.greeks?.theta).toFixed(4)}</td>
          <td>${parseFloat(option.pe?.greeks?.delta).toFixed(4)}</td>
          <td>${parseFloat(option.pe?.greeks?.vega).toFixed(4)}</td>
        </tr>
      `;
    });

    html += '</tbody></table></body></html>';

    res.send(html);  // Send the HTML table as the response
  } catch (error) {
    console.error('Error fetching option chain data:', error.message);
    res.status(500).json({ error: 'Failed to fetch data from Dhan API' });
  }
});

//react to html

app.post('/save-html-table', (req, res) => {
  const { html } = req.body;

  if (!html) return res.status(400).json({ error: 'No HTML provided' });

  const filePath = path.join(__dirname, '../client/public/option-table.html');

    console.log("Received HTML content: ", html);

  fs.writeFile(filePath, html, (err) => {
    if (err) {
      console.error('❌ Error writing HTML file:', err);
      return res.status(500).json({ error: 'Failed to save HTML' });
    }

    console.log('✅ HTML table saved to public folder');
    res.json({ success: true });
  });
});

// app.listen(PORT, () => {
//   console.log(`✅ Server running on http://localhost:${PORT}`);
// });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});

