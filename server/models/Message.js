const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
    userName: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    serviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    replied: { type: Boolean, default: false },
    adminReply: { type: String },
    replyAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);
