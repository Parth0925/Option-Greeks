const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5001;
app.use(cors({
  origin: 'https://option-greeks.netlify.app',
  credentials: true
}));
app.use(express.json());

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const optionSchema = new mongoose.Schema({
  strike: Number,
  ce: {
    delta: Number,
    theta: Number,
    vega: Number,
  },
  pe: {
    delta: Number,
    theta: Number,
    vega: Number,
  },
});

const snapshotSchema = new mongoose.Schema({
  underlying: String,
  expiry: String,
  last_price: Number,
  timestamp: { type: Date, default: Date.now },
  data: [optionSchema],
});

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));


const OptionChainSnapshot = mongoose.model('OptionChainSnapshot', snapshotSchema);

// Option Chain Endpoint
app.post('/api/optionchain', async (req, res) => {
  const { UnderlyingScrip, UnderlyingSeg, Expiry } = req.body;
  try {
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
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching data from Dhan API:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch from Dhan API' });
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
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching expiry list:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch expiry list' });
  }
});

// Fetch MongoDB data - Snapshot
app.get('/api/snapshots', async (req, res) => {
  try {
    const snapshots = await OptionChainSnapshot.find().sort({ timestamp: -1 }).limit(10); // Limit to 10 recent entries
    res.json(snapshots);
  } catch (err) {
    console.error('Failed to fetch snapshots from MongoDB:', err);
    res.status(500).json({ error: 'Failed to fetch MongoDB data' });
  }
});

// Save HTML file
app.post('/save-html-table', (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: 'No HTML provided' });

  const filePath = path.join(__dirname, '../client/public/option-table.html');
  fs.writeFile(filePath, html, (err) => {
    if (err) return res.status(500).json({ error: 'Failed to save HTML' });
    res.json({ success: true });
  });
});

// Periodically fetch and store fresh option chain data (overwrite)
const fetchAndStoreOptionData = async () => {
  const indices = [
    { name: 'SENSEX', UnderlyingScrip: 51, UnderlyingSeg: 'IDX_I' },
    { name: 'NIFTY', UnderlyingScrip: 13, UnderlyingSeg: 'IDX_I' },
  ];

  for (const index of indices) {
    try {
      const expiryRes = await axios.post(
        'https://api.dhan.co/v2/optionchain/expirylist',
        { UnderlyingScrip: index.UnderlyingScrip, UnderlyingSeg: index.UnderlyingSeg },
        {
          headers: {
            'access-token': process.env.REACT_APP_ACCESS_TOKEN,
            'client-id': process.env.REACT_APP_CLIENT_ID,
            'Content-Type': 'application/json',
          },
        }
      );

      const expiry = expiryRes.data.data[0];

      const dataRes = await axios.post(
        'https://api.dhan.co/v2/optionchain',
        { UnderlyingScrip: index.UnderlyingScrip, UnderlyingSeg: index.UnderlyingSeg, Expiry: expiry },
        {
          headers: {
            'access-token': process.env.REACT_APP_ACCESS_TOKEN,
            'client-id': process.env.REACT_APP_CLIENT_ID,
            'Content-Type': 'application/json',
          },
        }
      );

      const rawData = dataRes.data.data;

      const transformedData = Object.entries(rawData.oc).map(([strike, o]) => ({
        strike: parseInt(strike),
        ce: o.ce?.greeks || {},
        pe: o.pe?.greeks || {},
      }));

      await OptionChainSnapshot.replaceOne(
        { underlying: index.name, expiry },
        {
          underlying: index.name,
          expiry,
          last_price: rawData.last_price,
          timestamp: new Date(),
          data: transformedData,
        },
        { upsert: true }
      );

      console.log(`✅ [${index.name}] Updated Mongo snapshot`);
    } catch (err) {
      console.error(`❌ Failed for ${index.name}:`, err.message || err);
    }
  }
};

// Start periodic sync every 10 seconds
setInterval(fetchAndStoreOptionData, 10000);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
