const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @route   POST /api/reviews
// @desc    Submit a review for a completed booking
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { bookingId, rating, comment, workPicture } = req.body;

    // Validate inputs
    if (!bookingId || !rating || !comment) {
      return res.status(400).json({ error: 'Please provide bookingId, rating, and comment.' });
    }

    // Check if booking exists
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Verify booking customer is the one requesting
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized. You can only review your own bookings.' });
    }

    // Verify booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'You can only review completed services.' });
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ booking: bookingId });
    if (existingReview) {
      return res.status(400).json({ error: 'You have already submitted a review for this booking.' });
    }

    // Create review
    const review = new Review({
      booking: bookingId,
      customer: req.user._id,
      provider: booking.provider,
      rating: Number(rating),
      comment,
      workPicture: workPicture || ''
    });

    await review.save();

    // Recalculate provider average rating
    const providerId = booking.provider;
    const providerReviews = await Review.find({ provider: providerId });
    
    const sumRatings = providerReviews.reduce((sum, item) => sum + item.rating, 0);
    const avgRating = sumRatings / providerReviews.length;

    // Update provider profile rating
    const provider = await User.findById(providerId);
    if (provider && provider.providerProfile) {
      provider.providerProfile.rating = parseFloat(avgRating.toFixed(2));
      
      // Update top-rated badge if conditions met
      if (provider.providerProfile.rating >= 4.7 && provider.providerProfile.completedJobs >= 10) {
        provider.providerProfile.isTopRated = true;
      } else {
        provider.providerProfile.isTopRated = false;
      }
      
      await provider.save();
    }

    res.status(201).json(review);

  } catch (error) {
    res.status(500).json({ error: 'Server error saving review: ' + error.message });
  }
});

// @route   GET /api/reviews/provider/:providerId
// @desc    Get all reviews for a specific provider
// @access  Public
router.get('/provider/:providerId', async (req, res) => {
  try {
    const reviews = await Review.find({ provider: req.params.providerId })
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    res.status(500).json({ error: 'Server error loading reviews: ' + error.message });
  }
});

module.exports = router;
