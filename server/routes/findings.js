const express = require('express');
const Finding = require('../models/Finding');
const auth = require('../middleware/auth');
const router = express.Router();

// Get findings for an evidence item
router.get('/:evidenceId', auth, async (req, res) => {
    try {
        const findings = await Finding.find({ evidenceId: req.params.evidenceId })
            .populate('addedBy', 'name email role')
            .sort({ createdAt: -1 });
        res.json(findings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add finding
router.post('/:evidenceId', auth, async (req, res) => {
    try {
        const { content, type } = req.body;

        const finding = await Finding.create({
            evidenceId: req.params.evidenceId,
            content,
            type: type || 'observation',
            addedBy: req.user._id
        });

        const populated = await Finding.findById(finding._id)
            .populate('addedBy', 'name email role');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Delete finding
router.delete('/:id', auth, async (req, res) => {
    try {
        const finding = await Finding.findById(req.params.id);
        if (!finding) return res.status(404).json({ message: 'Finding not found' });

        if (finding.addedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to delete this finding' });
        }

        await Finding.findByIdAndDelete(req.params.id);
        res.json({ message: 'Finding deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
