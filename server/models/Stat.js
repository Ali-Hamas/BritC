const mongoose = require('mongoose');

const statSchema = new mongoose.Schema({
    label: { type: String, required: true },
    value: { type: String, required: true },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Stat', statSchema);
