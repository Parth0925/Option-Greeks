// src/API/api.js
import axios from 'axios';

const BASE_URL = 'http://localhost:5001/api';

// Fetch Option Chain Data
export const fetchOptionChainData = async (UnderlyingScrip, UnderlyingSeg, Expiry) => {
  try {
    const response = await axios.post(`${BASE_URL}/optionchain`, {
      UnderlyingScrip,
      UnderlyingSeg,
      Expiry,
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching option chain data:', error);
    throw error;
  }
};

// Fetch Expiry List
export const fetchExpiryList = async (UnderlyingScrip, UnderlyingSeg) => {
  try {
    const response = await axios.post(`${BASE_URL}/expirylist`, {
      UnderlyingScrip,
      UnderlyingSeg,
    });
    return response.data.data; // Only return the `data` array
  } catch (error) {
    console.error('Error fetching expiry list:', error);
    throw error;
  }
};