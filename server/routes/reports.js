const express = require('express');
const auth = require('../middleware/auth');
const { generateForensicReport } = require('../utils/pdfGenerator');
const router = express.Router();

// Generate forensic report for a case
router.get('/:caseId', auth, async (req, res) => {
    try {
        const pdfBuffer = await generateForensicReport(req.params.caseId);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=forensic_report_${req.params.caseId}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
