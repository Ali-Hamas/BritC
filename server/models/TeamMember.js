const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({
    name: { type: String, required: true },
    role: { type: String, required: true },
    image: { type: String, required: true }, 
    bio: { type: String }, 
    order: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('TeamMember', TeamMemberSchema);
