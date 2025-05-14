import React, { useEffect, useState } from 'react';
import { fetchOptionChainData, fetchExpiryList } from './API/api.js';
import MongoTable from './MongoTable.js'; // Import MongoTable to display MongoDB data
import * as XLSX from 'xlsx';

const indexOptions = {
  SENSEX: { UnderlyingScrip: 51, UnderlyingSeg: 'IDX_I' },
  //NIFTY: { UnderlyingScrip: 13, UnderlyingSeg: 'IDX_I' },
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
      setSelectedExpiry(dates[0]);
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
      const interval = setInterval(loadData, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedExpiry]);

  const formatNumber = (num) => (num !== undefined ? parseFloat(num).toFixed(4) : '-');
  const formatStrike = (strike) => parseInt(strike, 10);

  const exportToExcel = () => {
    const ws = XLSX.utils.table_to_sheet(document.getElementById("data-table"));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OptionChainData");
    XLSX.writeFile(wb, "option_chain_data.xlsx");
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h2>Option Chain - {selectedIndex}</h2>

      <label>
        Select Index:{' '}
        <select value={selectedIndex} onChange={(e) => setSelectedIndex(e.target.value)}>
          <option value="SENSEX">SENSEX</option>
          <option value="NIFTY">NIFTY</option>
        </select>
      </label>

      <label style={{ marginLeft: '20px' }}>
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
        <>
          <table
            id="data-table"
            border="1"
            cellPadding="6"
            style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'center' }}
          >
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
              {Object.entries(optionData.oc).map(([strike, data]) => (
                <tr key={strike}>
                  <td>{formatNumber(data.ce?.greeks?.vega)}</td>
                  <td>{formatNumber(data.ce?.greeks?.delta)}</td>
                  <td>{formatNumber(data.ce?.greeks?.theta)}</td>
                  <td><strong>{formatStrike(strike)}</strong></td>
                  <td>{formatNumber(data.pe?.greeks?.theta)}</td>
                  <td>{formatNumber(data.pe?.greeks?.delta)}</td>
                  <td>{formatNumber(data.pe?.greeks?.vega)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={exportToExcel}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              marginTop: '20px',
              cursor: 'pointer',
            }}
          >
            Export to Excel
          </button>
        </>
      )}

      {/* MongoDB Table */}
      <MongoTable />
    </div>
  );
};

export default App;
