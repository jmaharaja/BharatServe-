const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const Review = require('../models/Review');
const { auth, authorize } = require('../middleware/auth');

// Apply admin access only to all endpoints in this file
router.use(auth);
router.use(authorize('admin'));

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics & system stats
// @access  Private (Admin only)
router.get('/stats', async (req, res) => {
  try {
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProviders = await User.countDocuments({ role: 'provider' });
    const verifiedProviders = await User.countDocuments({ role: 'provider', 'providerProfile.isVerified': true });
    
    const bookings = await Booking.find();
    const totalBookings = bookings.length;
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const pendingBookings = bookings.filter(b => b.status === 'pending').length;
    const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;

    // Revenue calculation
    const totalRevenue = bookings
      .filter(b => b.status === 'completed' || b.paymentStatus === 'paid')
      .reduce((sum, b) => sum + b.totalAmount, 0);

    // Platform share is 15% of revenue
    const platformEarnings = parseFloat((totalRevenue * 0.15).toFixed(2));

    // Category distribution
    const categoryStats = {};
    bookings.forEach(b => {
      categoryStats[b.serviceCategory] = (categoryStats[b.serviceCategory] || 0) + 1;
    });

    res.json({
      metrics: {
        totalCustomers,
        totalProviders,
        verifiedProviders,
        totalBookings,
        completedBookings,
        pendingBookings,
        cancelledBookings,
        totalRevenue,
        platformEarnings
      },
      categoryStats
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error generating system statistics: ' + error.message });
  }
});

// @route   GET /api/admin/providers
// @desc    Get list of all registered providers
// @access  Private (Admin only)
router.get('/providers', async (req, res) => {
  try {
    const providers = await User.find({ role: 'provider' }).select('-password').sort({ createdAt: -1 });
    res.json(providers);
  } catch (error) {
    res.status(500).json({ error: 'Server error listing providers: ' + error.message });
  }
});

// @route   GET /api/admin/customers
// @desc    Get list of all registered customers
// @access  Private (Admin only)
router.get('/customers', async (req, res) => {
  try {
    const customers = await User.find({ role: 'customer' }).select('-password').sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: 'Server error listing customers: ' + error.message });
  }
});

// @route   PUT /api/admin/providers/:id/verify
// @desc    Toggle provider verification status
// @access  Private (Admin only)
router.put('/providers/:id/verify', async (req, res) => {
  try {
    const { isVerified, isBackgroundVerified } = req.body;
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' });

    if (!provider) {
      return res.status(404).json({ error: 'Service provider not found.' });
    }

    if (isVerified !== undefined) {
      provider.providerProfile.isVerified = isVerified;
    }

    if (isBackgroundVerified !== undefined) {
      provider.providerProfile.isBackgroundVerified = isBackgroundVerified;
    }

    // Recalculate profile completeness
    let completeCount = 0;
    const totalFields = 8;
    const details = provider.providerProfile;
    if (details.category) completeCount++;
    if (details.subCategory) completeCount++;
    if (details.experience > 0) completeCount++;
    if (details.startingPrice > 0) completeCount++;
    if (details.skills && details.skills.length > 0) completeCount++;
    if (details.languages && details.languages.length > 0) completeCount++;
    if (details.bio) completeCount++;
    if (details.address) completeCount++;
    
    details.profileCompleteness = Math.round((completeCount / totalFields) * 100);

    await provider.save();
    res.json(provider);

  } catch (error) {
    res.status(500).json({ error: 'Server error updating verification status: ' + error.message });
  }
});

// @route   GET /api/admin/reviews
// @desc    Get all system reviews
// @access  Private (Admin only)
router.get('/reviews', async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('customer', 'name email avatar')
      .populate('provider', 'name email')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server error listing reviews: ' + error.message });
  }
});

module.exports = router;
