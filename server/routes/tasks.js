const express = require('express');
const Task = require('../models/Task');
const CustodyLog = require('../models/CustodyLog');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const router = express.Router();

// Get all tasks (filtered by role)
router.get('/', auth, async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'analyst') {
            filter.assignedTo = req.user._id;
        } else if (req.user.role === 'supervisor') {
            filter.assignedBy = req.user._id;
        }

        if (req.query.status) filter.status = req.query.status;

        const tasks = await Task.find(filter)
            .populate('assignedBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .populate('evidenceId', 'originalName category')
            .populate('caseId', 'caseId title')
            .sort({ createdAt: -1 });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create task assignment
router.post('/', auth, roleCheck('admin', 'supervisor'), async (req, res) => {
    try {
        const { evidenceId, caseId, title, description, assignedTo, priority, dueDate } = req.body;

        const task = await Task.create({
            evidenceId,
            caseId,
            title,
            description,
            assignedBy: req.user._id,
            assignedTo,
            priority,
            dueDate
        });

        // Log task assignment
        await CustodyLog.create({
            evidenceId,
            action: 'analysis-started',
            performedBy: req.user._id,
            details: `Analysis task "${title}" assigned`
        });

        const populated = await Task.findById(task._id)
            .populate('assignedBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .populate('evidenceId', 'originalName category')
            .populate('caseId', 'caseId title');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Respond to task (accept/reject)
router.put('/:id/respond', auth, async (req, res) => {
    try {
        const { action, rejectionReason } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: 'Task not found' });
        if (task.assignedTo.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'You are not assigned to this task' });
        }
        if (task.status !== 'pending') {
            return res.status(400).json({ message: 'Task has already been responded to' });
        }

        if (action === 'accept') {
            task.status = 'accepted';
        } else if (action === 'reject') {
            task.status = 'rejected';
            task.rejectionReason = rejectionReason || 'No reason provided';
        } else {
            return res.status(400).json({ message: 'Invalid action. Use "accept" or "reject"' });
        }

        await task.save();

        const populated = await Task.findById(task._id)
            .populate('assignedBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .populate('evidenceId', 'originalName category')
            .populate('caseId', 'caseId title');

        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update task status (mark complete, in-progress)
router.put('/:id/status', auth, async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);

        if (!task) return res.status(404).json({ message: 'Task not found' });

        task.status = status;
        if (status === 'completed') {
            task.completedAt = new Date();

            await CustodyLog.create({
                evidenceId: task.evidenceId,
                action: 'analysis-completed',
                performedBy: req.user._id,
                details: `Analysis task "${task.title}" completed`
            });
        }

        await task.save();

        const populated = await Task.findById(task._id)
            .populate('assignedBy', 'name email role')
            .populate('assignedTo', 'name email role')
            .populate('evidenceId', 'originalName category')
            .populate('caseId', 'caseId title');

        res.json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
