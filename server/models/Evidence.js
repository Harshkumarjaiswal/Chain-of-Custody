const mongoose = require('mongoose');

const evidenceSchema = new mongoose.Schema({
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    originalName: {
        type: String,
        required: true
    },
    filePath: {
        type: String,
        required: true
    },
    fileSize: {
        type: Number,
        required: true
    },
    mimeType: String,
    hashValue: {
        type: String,
        required: true
    },
    hashAlgorithm: {
        type: String,
        default: 'SHA-256'
    },
    category: {
        type: String,
        enum: ['disk-image', 'log-file', 'document', 'memory-dump', 'network-capture', 'mobile-data', 'other'],
        default: 'other'
    },
    description: {
        type: String,
        default: ''
    },
    acquisitionTool: {
        type: String,
        enum: ['FTK Imager', 'Autopsy', 'EnCase', 'Other'],
        default: 'Other'
    },
    uploadedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    integrityStatus: {
        type: String,
        enum: ['verified', 'compromised', 'pending'],
        default: 'verified'
    },
    lastVerifiedAt: {
        type: Date,
        default: Date.now
    },
    aiSummary: {
        type: String,
        default: ''
    }
}, { timestamps: true });

module.exports = mongoose.model('Evidence', evidenceSchema);
