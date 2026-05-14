const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    role: {
        type: String,
        enum: ['admin', 'officer', 'analyst', 'supervisor'],
        default: 'officer'
    },
    department: {
        type: String,
        trim: true
    },
    bio: {
        type: String,
        trim: true,
        default: ''
    },
    level: {
        type: String,
        enum: ['junior', 'mid', 'senior', 'lead', 'expert'],
        default: 'junior'
    },
    workHistory: [
        {
            title: { type: String, trim: true },
            organization: { type: String, trim: true },
            from: { type: String },
            to: { type: String },
            current: { type: Boolean, default: false }
        }
    ],
    avatar: {
        type: String,
        default: ''
    },
    otpCode: {
        type: String,
        select: false
    },
    otpExpire: {
        type: Date,
        select: false
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
