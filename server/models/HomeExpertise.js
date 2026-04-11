const mongoose = require('mongoose');

const HomeExpertiseSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, required: true }, 
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('HomeExpertise', HomeExpertiseSchema);
