import React, { useEffect, useState } from 'react';
import axios from 'axios';

const MongoTable = () => {
  const [snapshots, setSnapshots] = useState([]);

  useEffect(() => {
    //axios.get('http://localhost:5001/api/snapshots')
    axios.get(`${process.env.REACT_APP_API_URL}/api/snapshots`)

      .then((res) => setSnapshots(res.data))
      .catch((err) => console.error('Error fetching Mongo data:', err));
  }, []);

  const formatNumber = (num) =>
    num !== undefined && num !== null ? parseFloat(num).toFixed(4) : '-';

  const formatStrike = (strike) => parseInt(strike, 10);

  return (
    <div style={{ marginTop: '40px' }}>
      <h3>MongoDB Snapshot Data</h3>
      <table
        border="1"
        cellPadding="6"
        style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}
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
          {snapshots.map((snap, snapIndex) =>
            snap.data.map((item, rowIndex) => (
              <tr key={`${snapIndex}-${rowIndex}`}>
                <td>{formatNumber(item.ce?.vega)}</td>
                <td>{formatNumber(item.ce?.delta)}</td>
                <td>{formatNumber(item.ce?.theta)}</td>
                <td><strong>{formatStrike(item.strike)}</strong></td>
                <td>{formatNumber(item.pe?.theta)}</td>
                <td>{formatNumber(item.pe?.delta)}</td>
                <td>{formatNumber(item.pe?.vega)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MongoTable;
