const mongoose = require('mongoose');

const custodyLogSchema = new mongoose.Schema({
    evidenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true
    },
    action: {
        type: String,
        required: true,
        enum: [
            'uploaded',
            'accessed',
            'downloaded',
            'transferred',
            'verified',
            'analysis-started',
            'analysis-completed',
            'modified-metadata',
            'report-generated',
            'deleted'
        ]
    },
    performedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    details: {
        type: String,
        default: ''
    },
    ipAddress: String,
    previousHash: String,
    currentHash: String
}, { timestamps: true });

custodyLogSchema.index({ evidenceId: 1, createdAt: -1 });

module.exports = mongoose.model('CustodyLog', custodyLogSchema);
