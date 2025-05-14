const mongoose = require('mongoose');

const OptionChainSchema = new mongoose.Schema({
  UnderlyingScrip: Number,
  UnderlyingSeg: String,
  Expiry: String,
  data: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

module.exports = mongoose.model('OptionChain', OptionChainSchema);
