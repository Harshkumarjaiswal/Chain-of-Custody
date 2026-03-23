const express = require('express');
const Finding = require('../models/Finding');
const Evidence = require('../models/Evidence');
const auth = require('../middleware/auth');
const router = express.Router();

// AI Summarize findings for an evidence item
router.post('/summarize/:evidenceId', auth, async (req, res) => {
    try {
        const findings = await Finding.find({ evidenceId: req.params.evidenceId })
            .populate('addedBy', 'name role')
            .sort({ createdAt: 1 });

        if (findings.length === 0) {
            return res.status(400).json({ message: 'No findings available to summarize' });
        }

        // Mock AI Summarization (extractive approach)
        // In production, this would call a Python/Transformers microservice
        const summary = generateMockSummary(findings);

        // Save summary to evidence
        await Evidence.findByIdAndUpdate(req.params.evidenceId, {
            aiSummary: summary
        });

        res.json({ summary });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

function generateMockSummary(findings) {
    const grouped = {};
    findings.forEach(f => {
        if (!grouped[f.type]) grouped[f.type] = [];
        grouped[f.type].push(f);
    });

    let summary = '## AI-Generated Investigation Summary\n\n';
    summary += `**Total Findings:** ${findings.length}\n`;
    summary += `**Analysis Period:** ${findings[0].createdAt.toLocaleDateString()} - ${findings[findings.length - 1].createdAt.toLocaleDateString()}\n`;
    summary += `**Contributing Analysts:** ${[...new Set(findings.map(f => f.addedBy.name))].join(', ')}\n\n`;

    if (grouped.observation) {
        summary += `### Key Observations (${grouped.observation.length})\n`;
        grouped.observation.slice(0, 5).forEach(f => {
            const firstSentence = f.content.split(/[.!?]/)[0].trim();
            summary += `- ${firstSentence}.\n`;
        });
        summary += '\n';
    }

    if (grouped.analysis) {
        summary += `### Analysis Results (${grouped.analysis.length})\n`;
        grouped.analysis.slice(0, 5).forEach(f => {
            const firstSentence = f.content.split(/[.!?]/)[0].trim();
            summary += `- ${firstSentence}.\n`;
        });
        summary += '\n';
    }

    if (grouped.conclusion) {
        summary += `### Conclusions (${grouped.conclusion.length})\n`;
        grouped.conclusion.forEach(f => {
            summary += `- ${f.content}\n`;
        });
        summary += '\n';
    }

    if (grouped.note) {
        summary += `### Additional Notes (${grouped.note.length})\n`;
        grouped.note.slice(0, 3).forEach(f => {
            const firstSentence = f.content.split(/[.!?]/)[0].trim();
            summary += `- ${firstSentence}.\n`;
        });
    }

    return summary;
}

module.exports = router;
