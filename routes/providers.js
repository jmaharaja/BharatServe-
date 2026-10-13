const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Review = require('../models/Review');
const { auth } = require('../middleware/auth');

// Recommendation scoring helper
const calculateRecommendationScore = (provider) => {
  const profile = provider.providerProfile || {};
  
  // 1. Rating Score (40%): average rating (out of 5) * 20 => maps 5.0 to 100
  const rating = profile.rating || 5.0;
  const ratingScore = rating * 20;

  // 2. Completed Jobs Score (30%): caps at 50 jobs for maximum 100 points
  const completedJobs = profile.completedJobs || 0;
  const jobsScore = Math.min(completedJobs * 2, 100);

  // 3. Response Time Score (15%): max(0, 100 - responseTimeMinutes)
  const responseTime = profile.responseTime || 30; // default 30 mins
  const responseScore = Math.max(0, 100 - responseTime);

  // 4. Repeat Customers Score (10%): repeat customer ratio
  const repeatCount = profile.repeatCustomersCount || 0;
  const totalCount = profile.totalCustomersCount || 0;
  const repeatRatio = totalCount > 0 ? (repeatCount / totalCount) * 100 : 0;
  const repeatScore = Math.min(repeatRatio, 100);

  // 5. Profile Completeness Score (5%)
  const completenessScore = profile.profileCompleteness || 80;

  // Calculate weights
  const ratingWeight = 0.40 * ratingScore;
  const jobsWeight = 0.30 * jobsScore;
  const responseWeight = 0.15 * responseScore;
  const repeatWeight = 0.10 * repeatScore;
  const completenessWeight = 0.05 * completenessScore;

  const totalScore = ratingWeight + jobsWeight + responseWeight + repeatWeight + completenessWeight;

  return {
    totalScore: parseFloat(totalScore.toFixed(1)),
    breakdown: {
      ratingScore: parseFloat(ratingWeight.toFixed(1)),
      jobsScore: parseFloat(jobsWeight.toFixed(1)),
      responseScore: parseFloat(responseWeight.toFixed(1)),
      repeatScore: parseFloat(repeatWeight.toFixed(1)),
      completenessScore: parseFloat(completenessWeight.toFixed(1))
    }
  };
};

// @route   GET /api/providers
// @desc    Get all providers with filters and recommendation sorting
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, subCategory, search, location } = req.query;

    // Filter build
    let query = { role: 'provider' };

    if (category) {
      query['providerProfile.category'] = category;
    }
    
    if (subCategory) {
      query['providerProfile.subCategory'] = subCategory;
    }

    if (location) {
      query['providerProfile.address'] = { $regex: location, $options: 'i' };
    }

    if (search) {
      query['$or'] = [
        { name: { $regex: search, $options: 'i' } },
        { 'providerProfile.subCategory': { $regex: search, $options: 'i' } },
        { 'providerProfile.skills': { $regex: search, $options: 'i' } }
      ];
    }

    let providers = await User.find(query).select('-password');

    // Score and rank providers
    let scoredProviders = providers.map(provider => {
      const scoring = calculateRecommendationScore(provider);
      return {
        ...provider.toObject(),
        recommendationScore: scoring.totalScore,
        recommendationBreakdown: scoring.breakdown
      };
    });

    // Sort by recommendationScore descending
    scoredProviders.sort((a, b) => b.recommendationScore - a.recommendationScore);

    // Apply deterministic daily shuffle to rotate professionals daily
    const today = new Date().toDateString();
    let seed = 0;
    for (let i = 0; i < today.length; i++) {
      seed = (seed << 5) - seed + today.charCodeAt(i);
      seed |= 0;
    }
    const random = () => {
      let x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    for (let i = scoredProviders.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [scoredProviders[i], scoredProviders[j]] = [scoredProviders[j], scoredProviders[i]];
    }

    res.json(scoredProviders);

  } catch (error) {
    res.status(500).json({ error: 'Server error fetching providers: ' + error.message });
  }
});

// @route   GET /api/providers/:id
// @desc    Get provider profile & verified reviews
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const provider = await User.findOne({ _id: req.params.id, role: 'provider' }).select('-password');
    if (!provider) {
      return res.status(404).json({ error: 'Provider not found.' });
    }

    // Get reviews
    const reviews = await Review.find({ provider: req.params.id })
      .populate('customer', 'name avatar')
      .sort({ createdAt: -1 });

    const scoring = calculateRecommendationScore(provider);

    res.json({
      ...provider.toObject(),
      recommendationScore: scoring.totalScore,
      recommendationBreakdown: scoring.breakdown,
      reviews
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error loading provider details: ' + error.message });
  }
});

// @route   POST /api/providers/:id/favorite
// @desc    Toggle favorite provider for customer
// @access  Private
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const providerId = req.params.id;
    const providerExists = await User.findOne({ _id: providerId, role: 'provider' });
    if (!providerExists) {
      return res.status(404).json({ error: 'Service provider not found.' });
    }

    const index = req.user.favorites.indexOf(providerId);
    let isFavorite = false;

    if (index >= 0) {
      req.user.favorites.splice(index, 1);
    } else {
      req.user.favorites.push(providerId);
      isFavorite = true;
    }

    await req.user.save();
    res.json({ isFavorite, favorites: req.user.favorites });

  } catch (error) {
    res.status(500).json({ error: 'Server error processing favorites: ' + error.message });
  }
});

module.exports = router;
