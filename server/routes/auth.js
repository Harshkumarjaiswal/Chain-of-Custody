const express = require('express');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const User = require('../models/User');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const router = express.Router();

// Temporary in-memory store for pending registrations
const pendingRegistrations = {};

// Reusable styled OTP email template
const otpEmailTemplate = (otp, type = 'login') => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
        
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:36px 40px;text-align:center;">
            <div style="font-size:13px;color:#a0aec0;letter-spacing:3px;text-transform:uppercase;margin-bottom:8px;">Digital Forensics Platform</div>
            <div style="font-size:24px;font-weight:900;color:#ffffff;letter-spacing:1px;">
              &#128274; DIGITAL-CHAIN-OF-CUSTODY
            </div>
            <div style="width:60px;height:3px;background:#4f46e5;margin:16px auto 0;border-radius:2px;"></div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px;">
            <p style="font-size:16px;color:#374151;margin:0 0 8px;">Hello,</p>
            <p style="font-size:15px;color:#6b7280;margin:0 0 28px;">
              ${type === 'register'
                ? 'Thank you for registering. Please verify your email address to complete your account setup.'
                : 'A login attempt was made to your account. Use the OTP below to complete sign-in.'}
            </p>

            <!-- OTP Box -->
            <div style="background:#f0f4ff;border:2px dashed #4f46e5;border-radius:10px;padding:28px;text-align:center;margin-bottom:28px;">
              <div style="font-size:13px;color:#6b7280;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Your One-Time Password</div>
              <div style="font-size:42px;font-weight:900;letter-spacing:12px;color:#1a1a2e;">${otp}</div>
              <div style="font-size:12px;color:#9ca3af;margin-top:12px;">&#9201; Valid for 10 minutes only</div>
            </div>

            <p style="font-size:13px;color:#9ca3af;margin:0 0 6px;">&#9888; Do not share this OTP with anyone.</p>
            <p style="font-size:13px;color:#9ca3af;margin:0;">If you did not request this, please ignore this email.</p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
            <p style="font-size:12px;color:#9ca3af;margin:0;">
              &copy; ${new Date().getFullYear()} <strong>Digital Chain of Custody</strong> &mdash; Secure Evidence Management System
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`;
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Register - Step 1: Send OTP to email before creating account
router.post('/register/send-otp', async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

        // Store pending registration in memory temporarily
        pendingRegistrations[email] = { name, email, password, role, department, otp, otpExpire };

        console.log(`\n📧 Register OTP for ${email}: ${otp}\n`);

        try {
            await transporter.sendMail({
                from: `"Digital Chain of Custody" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: '🔐 Verify Your Email - Digital Chain of Custody',
                html: otpEmailTemplate(otp, 'register')
            });
        } catch (mailError) {
            console.error('Email send failed:', mailError);
            return res.status(500).json({ message: 'Failed to send OTP email.' });
        }

        res.json({ message: 'OTP sent to your email. Please verify to complete registration.' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Register - Step 2: Verify OTP and create account
router.post('/register/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        const pending = pendingRegistrations[email];
        if (!pending) return res.status(400).json({ message: 'No pending registration for this email' });
        if (Date.now() > pending.otpExpire) {
            delete pendingRegistrations[email];
            return res.status(400).json({ message: 'OTP expired. Please register again.' });
        }
        if (pending.otp !== otp) return res.status(400).json({ message: 'Invalid OTP' });

        const { name, password, role, department } = pending;
        delete pendingRegistrations[email];

        const user = await User.create({ name, email, password, role, department });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });

        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Register (legacy - kept for compatibility)
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, role, department } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const user = await User.create({ name, email, password, role, department });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });

        res.status(201).json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Login (Step 1: Send OTP)
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate a random 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Save OTP to user and make it expire in 10 minutes
        user.otpCode = otp;
        user.otpExpire = Date.now() + 10 * 60 * 1000;
        await user.save();

        // Send the email
        try {
            await transporter.sendMail({
                from: `"Digital Chain of Custody" <${process.env.EMAIL_USER}>`,
                to: user.email,
                subject: '🔐 Your Login OTP - Digital Chain of Custody',
                html: otpEmailTemplate(otp, 'login')
            });
        } catch (mailError) {
            console.error('Email send failed:', mailError);
            return res.status(500).json({ message: 'Failed to send OTP email. Please ensure your email configuration is correct in .env.' });
        }

        res.json({ message: 'OTP sent to your email', userId: user._id });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify OTP (Step 2: Get Token)
router.post('/verify-otp', async (req, res) => {
    try {
        const { userId, otp } = req.body;
        const user = await User.findById(userId).select('+otpCode +otpExpire');

        // Check if user exists
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if OTP matches and hasn't expired
        if (!user.otpCode || user.otpCode !== otp || user.otpExpire < Date.now()) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        // Clear the OTP from the database
        user.otpCode = undefined;
        user.otpExpire = undefined;
        await user.save();

        // Issue JWT token
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE
        });

        res.json({
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get current user
router.get('/me', auth, async (req, res) => {
    res.json({ user: req.user });
});

// Get all users (admin only)
router.get('/users', auth, roleCheck('admin'), async (req, res) => {
    try {
        const users = await User.find().select('-__v');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Update user role (admin only)
router.put('/users/:id/role', auth, roleCheck('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role: req.body.role },
            { new: true, runValidators: true }
        );
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Toggle user active status (admin only)
router.put('/users/:id/toggle', auth, roleCheck('admin'), async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        user.isActive = !user.isActive;
        await user.save();
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
