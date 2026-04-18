const mongoose = require('mongoose');

const FAQSchema = new mongoose.Schema({
    question: { type: String, required: true },
    answer: { type: String, required: true },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('FAQ', FAQSchema);
