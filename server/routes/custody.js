const express = require('express');
const CustodyLog = require('../models/CustodyLog');
const auth = require('../middleware/auth');
const router = express.Router();

// Get custody log for an evidence item
router.get('/:evidenceId', auth, async (req, res) => {
    try {
        const logs = await CustodyLog.find({ evidenceId: req.params.evidenceId })
            .populate('performedBy', 'name email role')
            .sort({ createdAt: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all custody logs (admin/supervisor)
router.get('/', auth, async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = await CustodyLog.find()
            .populate('performedBy', 'name email role')
            .populate('evidenceId', 'originalName')
            .sort({ createdAt: -1 })
            .limit(limit);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
