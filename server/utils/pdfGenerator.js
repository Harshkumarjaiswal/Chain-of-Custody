const PDFDocument = require('pdfkit');
const Case = require('../models/Case');
const Evidence = require('../models/Evidence');
const CustodyLog = require('../models/CustodyLog');
const Finding = require('../models/Finding');

const generateForensicReport = async (caseId) => {
    const caseData = await Case.findById(caseId)
        .populate('createdBy', 'name email role')
        .populate('assignedInvestigators', 'name email role');

    if (!caseData) throw new Error('Case not found');

    const evidences = await Evidence.find({ caseId })
        .populate('uploadedBy', 'name role');

    const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
            Title: `Forensic Report - ${caseData.caseId}`,
            Author: 'Digital Evidence Management System',
            Subject: 'Forensic Investigation Report'
        }
    });

    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));

    // --- HEADER ---
    doc.fontSize(10).fillColor('#666')
        .text('CONFIDENTIAL - LAW ENFORCEMENT SENSITIVE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(22).fillColor('#0a0f1a')
        .text('DIGITAL FORENSIC INVESTIGATION REPORT', { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(12).fillColor('#333')
        .text(`Case ID: ${caseData.caseId}`, { align: 'center' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#666')
        .text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#0a0f1a');
    doc.moveDown(1);

    // --- CASE SUMMARY ---
    doc.fontSize(16).fillColor('#0a0f1a').text('1. Case Summary');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text(`Title: ${caseData.title}`);
    doc.text(`Status: ${caseData.status.toUpperCase()}`);
    doc.text(`Priority: ${caseData.priority.toUpperCase()}`);
    doc.text(`Created By: ${caseData.createdBy.name} (${caseData.createdBy.role})`);
    doc.text(`Date Created: ${caseData.createdAt.toLocaleString()}`);
    doc.moveDown(0.5);
    doc.text(`Description: ${caseData.description}`);
    doc.moveDown(0.5);

    if (caseData.assignedInvestigators.length > 0) {
        doc.text('Assigned Investigators:');
        caseData.assignedInvestigators.forEach(inv => {
            doc.text(`  • ${inv.name} (${inv.role}) - ${inv.email}`);
        });
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
    doc.moveDown(1);

    // --- EVIDENCE INVENTORY ---
    doc.fontSize(16).fillColor('#0a0f1a').text('2. Evidence Inventory');
    doc.moveDown(0.5);

    if (evidences.length === 0) {
        doc.fontSize(11).fillColor('#666').text('No evidence items found for this case.');
    } else {
        for (let i = 0; i < evidences.length; i++) {
            const ev = evidences[i];
            doc.fontSize(12).fillColor('#0a0f1a')
                .text(`Evidence ${i + 1}: ${ev.originalName}`);
            doc.fontSize(10).fillColor('#333');
            doc.text(`  Category: ${ev.category}`);
            doc.text(`  File Size: ${(ev.fileSize / 1024).toFixed(2)} KB`);
            doc.text(`  Hash (${ev.hashAlgorithm}): ${ev.hashValue}`);
            doc.text(`  Integrity Status: ${ev.integrityStatus.toUpperCase()}`);
            doc.text(`  Acquisition Tool: ${ev.acquisitionTool}`);
            doc.text(`  Uploaded By: ${ev.uploadedBy.name}`);
            doc.text(`  Upload Date: ${ev.createdAt.toLocaleString()}`);

            // Chain of Custody for this evidence
            const custodyLogs = await CustodyLog.find({ evidenceId: ev._id })
                .populate('performedBy', 'name role')
                .sort({ createdAt: 1 });

            if (custodyLogs.length > 0) {
                doc.moveDown(0.3);
                doc.fontSize(10).fillColor('#0a0f1a').text('  Chain of Custody:');
                custodyLogs.forEach(log => {
                    doc.fontSize(9).fillColor('#555');
                    doc.text(`    [${log.createdAt.toLocaleString()}] ${log.action} - ${log.performedBy.name} ${log.details ? `(${log.details})` : ''}`);
                });
            }

            // Findings for this evidence
            const findings = await Finding.find({ evidenceId: ev._id })
                .populate('addedBy', 'name role')
                .sort({ createdAt: 1 });

            if (findings.length > 0) {
                doc.moveDown(0.3);
                doc.fontSize(10).fillColor('#0a0f1a').text('  Investigation Findings:');
                findings.forEach(f => {
                    doc.fontSize(9).fillColor('#555');
                    doc.text(`    [${f.createdAt.toLocaleString()}] ${f.addedBy.name} (${f.type}): ${f.content}`);
                });
            }

            // AI Summary
            if (ev.aiSummary) {
                doc.moveDown(0.3);
                doc.fontSize(10).fillColor('#0a0f1a').text('  AI-Generated Summary:');
                doc.fontSize(9).fillColor('#555').text(`    ${ev.aiSummary}`);
            }

            doc.moveDown(0.8);
        }
    }

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#ddd');
    doc.moveDown(1);

    // --- INTEGRITY STATEMENT ---
    doc.fontSize(16).fillColor('#0a0f1a').text('3. Evidence Integrity Statement');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#333');
    doc.text('All evidence items listed in this report have been verified using SHA-256 cryptographic hashing. The hash values were generated at the time of evidence acquisition and have been compared against the current state of the evidence files.');
    doc.moveDown(0.5);

    const allVerified = evidences.every(e => e.integrityStatus === 'verified');
    if (allVerified) {
        doc.fillColor('#006600').text('STATUS: All evidence items have passed integrity verification.');
    } else {
        doc.fillColor('#cc0000').text('WARNING: One or more evidence items have failed integrity verification. Please review the evidence inventory for details.');
    }

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#0a0f1a');
    doc.moveDown(1);

    // --- FOOTER ---
    doc.fontSize(9).fillColor('#999')
        .text('This report was automatically generated by the Digital Evidence Management System.', { align: 'center' });
    doc.text('For legal proceedings, this report should be reviewed and authenticated by the lead investigator.', { align: 'center' });

    doc.end();

    return new Promise((resolve) => {
        doc.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
};

module.exports = { generateForensicReport };
