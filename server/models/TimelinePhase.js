const mongoose = require('mongoose');

const TimelinePhaseSchema = new mongoose.Schema({
    phaseNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('TimelinePhase', TimelinePhaseSchema);
