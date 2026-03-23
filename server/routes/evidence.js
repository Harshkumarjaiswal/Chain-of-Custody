const express = require('express');
const multer = require('multer');
const path = require('path');
const Evidence = require('../models/Evidence');
const CustodyLog = require('../models/CustodyLog');
const auth = require('../middleware/auth');
const { generateHash, verifyHash } = require('../utils/hashUtils');
const router = express.Router();

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 500 * 1024 * 1024 } // 500MB limit
});

// Get all evidence for a case
router.get('/case/:caseId', auth, async (req, res) => {
    try {
        const evidences = await Evidence.find({ caseId: req.params.caseId })
            .populate('uploadedBy', 'name email role')
            .sort({ createdAt: -1 });
        res.json(evidences);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single evidence detail
router.get('/detail/:id', auth, async (req, res) => {
    try {
        const evidence = await Evidence.findById(req.params.id)
            .populate('uploadedBy', 'name email role')
            .populate('caseId', 'caseId title');

        if (!evidence) return res.status(404).json({ message: 'Evidence not found' });

        // Log access
        await CustodyLog.create({
            evidenceId: evidence._id,
            action: 'accessed',
            performedBy: req.user._id,
            details: 'Evidence detail viewed',
            ipAddress: req.ip
        });

        res.json(evidence);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Upload evidence
router.post('/upload/:caseId', auth, upload.single('evidenceFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const hashValue = await generateHash(req.file.path);

        const evidence = await Evidence.create({
            caseId: req.params.caseId,
            fileName: req.file.filename,
            originalName: req.file.originalname,
            filePath: req.file.path,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            hashValue,
            category: req.body.category || 'other',
            description: req.body.description || '',
            acquisitionTool: req.body.acquisitionTool || 'Other',
            uploadedBy: req.user._id
        });

        // Create custody log entry
        await CustodyLog.create({
            evidenceId: evidence._id,
            action: 'uploaded',
            performedBy: req.user._id,
            details: `Evidence file "${req.file.originalname}" uploaded. Hash: ${hashValue}`,
            currentHash: hashValue,
            ipAddress: req.ip
        });

        const populated = await Evidence.findById(evidence._id)
            .populate('uploadedBy', 'name email role');

        res.status(201).json(populated);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify evidence integrity
router.post('/verify/:id', auth, async (req, res) => {
    try {
        const evidence = await Evidence.findById(req.params.id);
        if (!evidence) return res.status(404).json({ message: 'Evidence not found' });

        const result = await verifyHash(evidence.filePath, evidence.hashValue);

        evidence.integrityStatus = result.isValid ? 'verified' : 'compromised';
        evidence.lastVerifiedAt = new Date();
        await evidence.save();

        // Log verification
        await CustodyLog.create({
            evidenceId: evidence._id,
            action: 'verified',
            performedBy: req.user._id,
            details: `Integrity check: ${result.isValid ? 'PASSED' : 'FAILED'}`,
            previousHash: result.originalHash,
            currentHash: result.currentHash,
            ipAddress: req.ip
        });

        res.json({
            isValid: result.isValid,
            originalHash: result.originalHash,
            currentHash: result.currentHash,
            integrityStatus: evidence.integrityStatus
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all evidence (for dashboard stats)
router.get('/all', auth, async (req, res) => {
    try {
        const evidences = await Evidence.find()
            .populate('uploadedBy', 'name email role')
            .populate('caseId', 'caseId title')
            .sort({ createdAt: -1 });
        res.json(evidences);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
