const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

// @route   POST /api/bookings
// @desc    Create a new booking
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { providerId, serviceCategory, serviceSubCategory, bookingDate, bookingTimeSlot, address, paymentMethod, totalAmount, message } = req.body;

    // Check if provider exists and is a provider
    const provider = await User.findOne({ _id: providerId, role: 'provider' });
    if (!provider) {
      return res.status(404).json({ error: 'Selected service provider not found.' });
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    const booking = new Booking({
      customer: req.user._id,
      provider: providerId,
      serviceCategory,
      serviceSubCategory,
      bookingDate: new Date(bookingDate),
      bookingTimeSlot,
      address,
      message: message || '',
      otp,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: paymentMethod === 'card' ? 'paid' : 'pending',
      totalAmount
    });

    await booking.save();

    res.status(201).json(booking);

  } catch (error) {
    res.status(500).json({ error: 'Server error creating booking: ' + error.message });
  }
});

// @route   GET /api/bookings
// @desc    Get bookings based on user role (customer, provider, admin)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let bookings = [];

    if (req.user.role === 'customer') {
      bookings = await Booking.find({ customer: req.user._id })
        .populate('provider', 'name phone email avatar providerProfile')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'provider') {
      bookings = await Booking.find({ provider: req.user._id })
        .populate('customer', 'name phone email avatar')
        .sort({ createdAt: -1 });
    } else if (req.user.role === 'admin') {
      bookings = await Booking.find()
        .populate('customer', 'name email')
        .populate('provider', 'name providerProfile')
        .sort({ createdAt: -1 });
    }

    res.json(bookings);

  } catch (error) {
    res.status(500).json({ error: 'Server error fetching bookings: ' + error.message });
  }
});

// @route   PUT /api/bookings/:id/status
// @desc    Update booking status (Accept, Reject, Complete, Cancel)
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const bookingId = req.params.id;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Authorization checks based on status transitions
    if (req.user.role === 'customer') {
      // Customers can only cancel pending/accepted bookings
      if (status !== 'cancelled') {
        return res.status(403).json({ error: 'Customers are only allowed to cancel bookings.' });
      }
      if (booking.customer.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized. Not your booking.' });
      }
      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return res.status(400).json({ error: `Cannot cancel a ${booking.status} booking.` });
      }
    } else if (req.user.role === 'provider') {
      // Providers can accept, reject, start, complete
      if (!['accepted', 'rejected', 'started', 'completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status action for service provider.' });
      }
      if (booking.provider.toString() !== req.user._id.toString()) {
        return res.status(403).json({ error: 'Unauthorized. Booking not assigned to you.' });
      }

      // OTP verification check when starting the job
      if (status === 'started') {
        if (booking.status !== 'accepted') {
          return res.status(400).json({ error: 'Job must be accepted before it can be started.' });
        }
        if (!req.body.otp || req.body.otp !== booking.otp) {
          return res.status(400).json({ error: 'Invalid start OTP. Please ask the customer for the correct code.' });
        }
      }

      if (status === 'completed' && booking.status !== 'started') {
        return res.status(400).json({ error: 'Job must be started by entering the OTP before it can be marked completed.' });
      }

      if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'rejected') {
        return res.status(400).json({ error: `Cannot update booking with status: ${booking.status}` });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized role.' });
    }

    const previousStatus = booking.status;
    booking.status = status;
    
    // Auto pay on completion if cash on service
    if (status === 'completed' && booking.paymentMethod === 'cash') {
      booking.paymentStatus = 'paid';
    }

    await booking.save();

    // Trigger stats update if booking is completed
    if (status === 'completed' && previousStatus !== 'completed') {
      const provider = await User.findById(booking.provider);
      if (provider && provider.providerProfile) {
        // Increment completed jobs
        provider.providerProfile.completedJobs += 1;

        // Check if customer is a repeat customer
        // Find previous completed bookings of this customer with this provider
        const completedBookingsCount = await Booking.countDocuments({
          customer: booking.customer,
          provider: booking.provider,
          status: 'completed',
          _id: { $ne: booking._id } // exclude current booking
        });

        if (completedBookingsCount === 0) {
          // First completed booking with this provider
          provider.providerProfile.totalCustomersCount += 1;
        } else if (completedBookingsCount === 1) {
          // This booking is the second completed one -> customer becomes a repeat customer!
          provider.providerProfile.repeatCustomersCount += 1;
        } else {
          // Already a repeat customer, repeatCount doesn't need to increment again, 
          // but let's ensure ratio math is clean.
        }

        // recalculate badges on the fly
        if (provider.providerProfile.completedJobs >= 10 && provider.providerProfile.rating >= 4.7) {
          provider.providerProfile.isTopRated = true;
        }

        await provider.save();
      }
    }

    res.json(booking);

  } catch (error) {
    res.status(500).json({ error: 'Server error updating booking: ' + error.message });
  }
});

module.exports = router;
