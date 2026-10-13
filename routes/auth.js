const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// Generate JWT Helper
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'BharatServe_secure_secret_key_2026_987654321_jwt',
    { expiresIn: '30d' }
  );
};

// @route   POST /api/auth/register
// @desc    Register a customer or provider
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, role, providerDetails } = req.body;

    // Check if user already exists
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }

    // Create base user
    user = new User({
      name,
      email,
      password,
      phone,
      role: role || 'customer'
    });

    // If role is provider, initialize providerProfile
    if (role === 'provider') {
      const details = providerDetails || {};
      user.providerProfile = {
        category: details.category || 'Home Services',
        subCategory: details.subCategory || 'Plumbing',
        experience: details.experience || 0,
        skills: details.skills || [],
        languages: details.languages || ['Hindi', 'English'],
        startingPrice: details.startingPrice || 299,
        rating: 5.0,
        completedJobs: 0,
        responseTime: 30, // Default 30 minutes
        repeatCustomersCount: 0,
        totalCustomersCount: 0,
        profileCompleteness: 85, // Pre-filled details count
        isVerified: false,
        isBackgroundVerified: false,
        isTopRated: false,
        isFastResponse: true,
        availability: details.availability || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
        bio: details.bio || 'Professional service provider',
        address: details.address || ''
      };
    }

    await user.save();

    // Create token
    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error. Registration failed: ' + error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user & get token
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = (email || '').trim().toLowerCase();

    // Check user exists
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials. User not found.' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    // Create token
    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error. Login failed.' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching user details.' });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile details
// @access  Private
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, phone, addresses, avatar, providerDetails } = req.body;
    
    if (name) req.user.name = name;
    if (phone) req.user.phone = phone;
    if (avatar !== undefined) req.user.avatar = avatar;
    if (addresses) req.user.addresses = addresses;

    // Update provider profile if applicable
    if (req.user.role === 'provider' && providerDetails) {
      const details = req.user.providerProfile || {};
      
      if (providerDetails.category) details.category = providerDetails.category;
      if (providerDetails.subCategory) details.subCategory = providerDetails.subCategory;
      if (providerDetails.experience !== undefined) details.experience = Number(providerDetails.experience);
      if (providerDetails.startingPrice !== undefined) details.startingPrice = Number(providerDetails.startingPrice);
      if (providerDetails.skills) details.skills = providerDetails.skills;
      if (providerDetails.languages) details.languages = providerDetails.languages;
      if (providerDetails.bio) details.bio = providerDetails.bio;
      if (providerDetails.address) details.address = providerDetails.address;
      if (providerDetails.availability) details.availability = providerDetails.availability;
      
      // Calculate profile completeness
      let completeCount = 0;
      const totalFields = 8;
      if (details.category) completeCount++;
      if (details.subCategory) completeCount++;
      if (details.experience > 0) completeCount++;
      if (details.startingPrice > 0) completeCount++;
      if (details.skills && details.skills.length > 0) completeCount++;
      if (details.languages && details.languages.length > 0) completeCount++;
      if (details.bio) completeCount++;
      if (details.address) completeCount++;
      
      details.profileCompleteness = Math.round((completeCount / totalFields) * 100);

      req.user.providerProfile = details;
    }

    await req.user.save();
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Server error updating profile: ' + error.message });
  }
});

module.exports = router;
