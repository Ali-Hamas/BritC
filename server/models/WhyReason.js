const mongoose = require('mongoose');

const whyReasonSchema = new mongoose.Schema({
    title: { type: String, required: true },
    desc: { type: String, required: true },
    icon: { type: String, default: 'Zap' },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('WhyReason', whyReasonSchema);
