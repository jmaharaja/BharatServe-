require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');
const mongoose = require('mongoose');

// Initialize app
const app = express();

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Database Health Check Middleware
const dbCheck = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(500).json({ error: 'Database offline. BharatServe server is running in offline database mode.' });
  }
  next();
};

// Serve static assets from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Health Check Endpoint for client-side auto-detector
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', serverTime: new Date() });
});

// Register API Routes
app.use('/api/auth', dbCheck, require('./routes/auth'));
app.use('/api/providers', dbCheck, require('./routes/providers'));
app.use('/api/bookings', dbCheck, require('./routes/bookings'));
app.use('/api/reviews', dbCheck, require('./routes/reviews'));
app.use('/api/admin', dbCheck, require('./routes/admin'));

// Fallback routing for SPA feel or file-direct handling
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Define Port
const PORT = process.env.PORT || 5000;

// Start Server
const server = app.listen(PORT, () => {
  console.log(`BharatServe Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
