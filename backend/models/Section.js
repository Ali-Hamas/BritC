const mongoose = require('mongoose');

const ContentItemSchema = new mongoose.Schema({
    id: { type: Number }, // Maintain legacy ID if needed, or rely on _id
    title: { type: String },
    content: { type: String },
    image: { type: String },
    link: { type: String }
});

const SectionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String },
    order: { type: Number, default: 0 },
    content: [ContentItemSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Section', SectionSchema);
