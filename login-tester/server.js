const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory OTP store: { email: { otp, expiresAt } }
const otpStore = {};

// Gmail transporter using Nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'uday92689@gmail.com',
    pass: 'bcwzxbayldxolbki'
  }
});

// POST /send-otp
app.post('/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: 'Email is required' });

  const otp = Math.floor(10000 + Math.random() * 90000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  otpStore[email] = { otp, expiresAt };

  console.log(`\n📧 OTP for ${email}: ${otp}\n`);

  try {
    await transporter.sendMail({
      from: 'uday92689@gmail.com',
      to: email,
      subject: 'Your OTP Code',
      html: `<p>Your OTP is: <strong>${otp}</strong></p><p>It expires in 5 minutes.</p>`
    });
    res.json({ message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
});

// POST /verify-otp
app.post('/verify-otp', (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });

  const record = otpStore[email];

  if (!record) return res.json({ valid: false, message: 'No OTP found for this email' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.json({ valid: false, message: 'OTP expired' });
  }
  if (record.otp !== otp) return res.json({ valid: false, message: 'Invalid User' });

  delete otpStore[email];
  res.json({ valid: true, message: 'Valid User' });
});

const PORT = 4000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
