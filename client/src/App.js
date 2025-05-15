import React, { useEffect, useState } from 'react';
import { fetchOptionChainData, fetchExpiryList } from './API/api.js';

const indexOptions = {
  NIFTY: { UnderlyingScrip: 13, UnderlyingSeg: 'IDX_I' },
  SENSEX: { UnderlyingScrip: 51, UnderlyingSeg: 'IDX_I' },
};

const App = () => {
  const [optionData, setOptionData] = useState(null);
  const [expiryDates, setExpiryDates] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState('SENSEX');
  const [selectedExpiry, setSelectedExpiry] = useState('');
  const [error, setError] = useState(null);

  const loadData = async () => {
    try {
      const { UnderlyingScrip, UnderlyingSeg } = indexOptions[selectedIndex];
      if (!selectedExpiry) return;
      const data = await fetchOptionChainData(UnderlyingScrip, UnderlyingSeg, selectedExpiry);
      setOptionData(data.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data from Dhan API');
    }
  };

  const loadExpiryDates = async () => {
    try {
      const { UnderlyingScrip, UnderlyingSeg } = indexOptions[selectedIndex];
      const dates = await fetchExpiryList(UnderlyingScrip, UnderlyingSeg);
      setExpiryDates(dates);
      setSelectedExpiry(dates[0]); // Set default to first expiry
    } catch (err) {
      console.error(err);
      setError('Failed to fetch expiry dates');
    }
  };

  useEffect(() => {
    loadExpiryDates();
  }, [selectedIndex]);

  useEffect(() => {
    if (selectedExpiry) {
      loadData();
      const interval = setInterval(loadData, 60000); // 60 seconds
      return () => clearInterval(interval);
    }
  }, [selectedExpiry]);

  const formatNumber = (num) => (num !== undefined ? num.toFixed(4) : '-');

  const getFilteredRows = () => {
    if (!optionData?.oc || !optionData.last_price) return [];

    const strikes = Object.keys(optionData.oc).map(Number);
    const sortedStrikes = strikes.sort((a, b) => a - b);
    const underlying = optionData.last_price;

    // Find the closest strike to the underlying
    let closestIndex = sortedStrikes.findIndex((strike) => strike >= underlying);
    if (closestIndex === -1) closestIndex = sortedStrikes.length - 1;

    const start = Math.max(0, closestIndex - 15);
    const end = Math.min(sortedStrikes.length, closestIndex + 16); // +16 for inclusive range (15 above + 1 ATM)

    return sortedStrikes.slice(start, end).map((strike) => ({
      strike,
      data: optionData.oc[strike.toFixed(6)], // match original string format keys
    }));
  };

  const filteredRows = getFilteredRows();

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>Option Chain - {selectedIndex}</h2>

      <label>
        Select Index:{' '}
        <select value={selectedIndex} onChange={(e) => setSelectedIndex(e.target.value)}>
          <option value="NIFTY">NIFTY</option>
          <option value="SENSEX">SENSEX</option>
        </select>
      </label>

      <label>
        Select Expiry:{' '}
        <select value={selectedExpiry} onChange={(e) => setSelectedExpiry(e.target.value)}>
          {expiryDates.map((date) => (
            <option key={date} value={date}>
              {date}
            </option>
          ))}
        </select>
      </label>

      {optionData?.last_price && (
        <p style={{ fontSize: '18px', fontWeight: 'bold' }}>
          Underlying Price: {optionData.last_price}
        </p>
      )}

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!optionData ? (
        <p>Loading...</p>
      ) : (
        <table border="1" cellPadding="6" style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center' }}>
          <thead style={{ backgroundColor: '#f0f0f0' }}>
            <tr>
              <th>CE Vega</th>
              <th>CE Delta</th>
              <th>CE Theta</th>
              <th>Strike</th>
              <th>PE Theta</th>
              <th>PE Delta</th>
              <th>PE Vega</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map(({ strike, data }) => (
              <tr key={strike}>
                <td>{formatNumber(data.ce?.greeks?.vega)}</td>
                <td>{formatNumber(data.ce?.greeks?.delta)}</td>
                <td>{formatNumber(data.ce?.greeks?.theta)}</td>
                <td><strong>{strike}</strong></td>
                <td>{formatNumber(data.pe?.greeks?.theta)}</td>
                <td>{formatNumber(data.pe?.greeks?.delta)}</td>
                <td>{formatNumber(data.pe?.greeks?.vega)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default App;
