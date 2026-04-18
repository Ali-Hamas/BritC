const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    type: { type: String, enum: ['main', 'secondary'], default: 'secondary' },
    icon: { type: String, required: false }, // Store Lucid icon name as string e.g., 'Code'
    description: { type: String }, // Short desc for card
    detailed_desc: { type: String }, // Long desc for popup
    filter_slug: { type: String }, // For main cards to redirect to work filter
    detailed_features: [{ type: String }], // Comma separated features for popup
    process: { type: String }, // Process steps (comma separated or multiline)
    pricing: { type: String }, // Pricing text
    color: { type: String },   // Gradient classes for main cards
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Service', ServiceSchema);
