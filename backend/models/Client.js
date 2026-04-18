const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: { type: String, required: true },
    image: { type: String, required: true }, 
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Client', clientSchema);
