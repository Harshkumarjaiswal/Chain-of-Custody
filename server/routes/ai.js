const express = require('express');
const Groq = require('groq-sdk');
const Finding = require('../models/Finding');
const Evidence = require('../models/Evidence');
const auth = require('../middleware/auth');
const router = express.Router();

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// AI Summarize findings using Groq (LLaMA 3.3 70B)
router.post('/summarize/:evidenceId', auth, async (req, res) => {
    try {
        const evidence = await Evidence.findById(req.params.evidenceId)
            .populate('caseId', 'title caseId');

        const findings = await Finding.find({ evidenceId: req.params.evidenceId })
            .populate('addedBy', 'name role')
            .sort({ createdAt: 1 });

        if (findings.length === 0) {
            // Generate summary from evidence metadata alone when no findings exist
            const prompt = `You are an expert digital forensics analyst writing a professional investigation report.

Evidence File: "${evidence.originalName}"
Case: ${evidence.caseId?.title || 'N/A'} (${evidence.caseId?.caseId || 'N/A'})
File Category: ${evidence.category}
File Size: ${(evidence.fileSize / 1024).toFixed(2)} KB
Acquisition Tool: ${evidence.acquisitionTool}
Integrity Status: ${evidence.integrityStatus}
Upload Date: ${new Date(evidence.createdAt).toLocaleDateString()}

No investigation findings have been added yet for this evidence.

Write a brief professional forensic intake summary covering:
1. Evidence identification and classification
2. Integrity status assessment
3. Recommended analysis steps for this type of evidence
4. Notes for the investigating officer

Keep it concise and professional.`;

            const completion = await groq.chat.completions.create({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    { role: 'system', content: 'You are an expert digital forensics analyst.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.4,
                max_tokens: 800
            });

            const summary = completion.choices[0].message.content;
            await Evidence.findByIdAndUpdate(req.params.evidenceId, { aiSummary: summary });
            return res.json({ summary });
        }

        const findingsText = findings.map((f, i) =>
            `${i + 1}. [${f.type.toUpperCase()}] by ${f.addedBy?.name} (${f.addedBy?.role}) on ${new Date(f.createdAt).toLocaleDateString()}:\n   ${f.content}`
        ).join('\n\n');

        const prompt = `You are an expert digital forensics analyst writing a professional investigation report.

Evidence File: "${evidence.originalName}"
Case: ${evidence.caseId?.title || 'N/A'} (${evidence.caseId?.caseId || 'N/A'})
File Category: ${evidence.category}
Integrity Status: ${evidence.integrityStatus}
Total Findings: ${findings.length}

Investigation Findings:
${findingsText}

Write a concise, professional forensic summary that includes:
1. A brief overview of what was investigated
2. Key observations and patterns found
3. Analysis results and their significance
4. Conclusions drawn from the evidence
5. Recommended next steps

Keep the tone professional and suitable for a legal/forensic report. Format with clear sections.`;

        const completion = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [
                {
                    role: 'system',
                    content: 'You are an expert digital forensics analyst. Provide clear, structured, and professional forensic investigation summaries.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.4,
            max_tokens: 1024
        });

        const summary = completion.choices[0].message.content;

        await Evidence.findByIdAndUpdate(req.params.evidenceId, { aiSummary: summary });

        res.json({ summary });
    } catch (error) {
        console.error('Groq AI error:', error.message);
        res.status(500).json({ message: 'AI summarization failed: ' + error.message });
    }
});

module.exports = router;
