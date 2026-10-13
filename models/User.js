const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ProviderProfileSchema = new mongoose.Schema({
  category: { type: String }, // 'Home Services', 'Office Services', 'Shop Services'
  subCategory: { type: String }, // e.g. 'Plumbing', 'AC Repair', 'Office Cleaning'
  experience: { type: Number, default: 0 },
  skills: [{ type: String }],
  languages: [{ type: String }],
  startingPrice: { type: Number, default: 0 },
  rating: { type: Number, default: 5.0 },
  completedJobs: { type: Number, default: 0 },
  responseTime: { type: Number, default: 30 }, // in minutes
  repeatCustomersCount: { type: Number, default: 0 },
  totalCustomersCount: { type: Number, default: 0 },
  profileCompleteness: { type: Number, default: 80 }, // in percentage
  isVerified: { type: Boolean, default: false },
  isBackgroundVerified: { type: Boolean, default: false },
  isTopRated: { type: Boolean, default: false },
  isFastResponse: { type: Boolean, default: false },
  availability: [{ type: String }], // e.g. ["Monday", "Tuesday", "Wednesday"]
  bio: { type: String },
  address: { type: String }
});

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  role: { type: String, enum: ['customer', 'provider', 'admin'], default: 'customer' },
  avatar: { type: String, default: '' },
  addresses: [{ type: String }], // for customer addresses
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // save favorite providers
  providerProfile: ProviderProfileSchema,
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
