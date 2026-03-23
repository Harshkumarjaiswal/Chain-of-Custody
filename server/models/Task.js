const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
    evidenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Evidence',
        required: true
    },
    caseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Case',
        required: true
    },
    title: {
        type: String,
        required: [true, 'Task title is required'],
        trim: true
    },
    description: {
        type: String,
        default: ''
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'in-progress', 'completed'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    dueDate: Date,
    completedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);
