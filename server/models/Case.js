const mongoose = require('mongoose');

const caseSchema = new mongoose.Schema({
    caseId: {
        type: String,
        required: true,
        unique: true
    },
    title: {
        type: String,
        required: [true, 'Case title is required'],
        trim: true
    },
    description: {
        type: String,
        required: [true, 'Case description is required']
    },
    status: {
        type: String,
        enum: ['open', 'in-progress', 'closed', 'archived'],
        default: 'open'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedInvestigators: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    tags: [String],
    closedAt: Date
}, { timestamps: true });

// Auto-generate caseId
caseSchema.pre('validate', async function (next) {
    if (!this.caseId) {
        const count = await mongoose.model('Case').countDocuments();
        const year = new Date().getFullYear();
        this.caseId = `CF-${year}-${String(count + 1).padStart(5, '0')}`;
    }
    next();
});

module.exports = mongoose.model('Case', caseSchema);
