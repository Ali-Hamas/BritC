const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true }, // 'web', 'app', 'automation', 'design'
    image: { type: String, required: true },
    liveUrl: { type: String },
    description: { type: String }, // Short desc for card
    challenge: { type: String },   // Detailed info for popup
    solution: { type: String },    // Detailed info for popup
    client: { type: String },
    duration: { type: String },
    technologies: [{ type: String }],
    stats: {
        label: String,
        value: String
    },
    featured: { type: Boolean, default: false } // For Home page "Featured Work"
}, { timestamps: true });

module.exports = mongoose.model('Project', ProjectSchema);
