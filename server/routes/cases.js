const express = require('express');
const Case = require('../models/Case');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const router = express.Router();

// Get all cases
router.get('/', auth, async (req, res) => {
    try {
        const filter = {};
        if (req.query.status) filter.status = req.query.status;
        if (req.query.priority) filter.priority = req.query.priority;

        // Analysts and officers see only their assigned cases + cases they created
        if (['analyst', 'officer'].includes(req.user.role)) {
            filter.$or = [
                { createdBy: req.user._id },
                { assignedInvestigators: req.user._id }
            ];
        }

        const cases = await Case.find(filter)
            .populate('createdBy', 'name email role')
            .populate('assignedInvestigators', 'name email role')
            .sort({ createdAt: -1 });

        res.json(cases);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single case
router.get('/:id', auth, async (req, res) => {
    try {
        const caseData = await Case.findById(req.params.id)
            .populate('createdBy', 'name email role')
            .populate('assignedInvestigators', 'name email role');

        if (!caseData) return res.status(404).json({ message: 'Case not found' });
        res.json(caseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create case
router.post('/', auth, roleCheck('admin', 'officer', 'supervisor'), async (req, res) => {
    try {
        const { title, description, priority, assignedInvestigators, tags } = req.body;

        const newCase = await Case.create({
            title,
            description,
            priority,
            createdBy: req.user._id,
            assignedInvestigators: assignedInvestigators || [],
            tags: tags || []
        });

        const populated = await Case.findById(newCase._id)
            .populate('createdBy', 'name email role')
            .populate('assignedInvestigators', 'name email role');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update case
router.put('/:id', auth, roleCheck('admin', 'officer', 'supervisor'), async (req, res) => {
    try {
        const updates = req.body;
        if (updates.status === 'closed') {
            updates.closedAt = new Date();
        }

        const caseData = await Case.findByIdAndUpdate(req.params.id, updates, {
            new: true,
            runValidators: true
        })
            .populate('createdBy', 'name email role')
            .populate('assignedInvestigators', 'name email role');

        if (!caseData) return res.status(404).json({ message: 'Case not found' });
        res.json(caseData);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete case
router.delete('/:id', auth, roleCheck('admin'), async (req, res) => {
    try {
        const caseData = await Case.findByIdAndDelete(req.params.id);
        if (!caseData) return res.status(404).json({ message: 'Case not found' });
        res.json({ message: 'Case deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get case stats
router.get('/stats/overview', auth, async (req, res) => {
    try {
        const total = await Case.countDocuments();
        const open = await Case.countDocuments({ status: 'open' });
        const inProgress = await Case.countDocuments({ status: 'in-progress' });
        const closed = await Case.countDocuments({ status: 'closed' });

        res.json({ total, open, inProgress, closed });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
