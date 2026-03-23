const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
    evidenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true
    },
    content: {
        type: String,
        required: [true, 'Finding content is required']
    },
    type: {
        type: String,
        enum: ['observation', 'analysis', 'conclusion', 'note'],
        default: 'observation'
    },
    addedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attachments: [String]
}, { timestamps: true });

findingSchema.index({ evidenceId: 1, createdAt: -1 });

module.exports = mongoose.model('Finding', findingSchema);
