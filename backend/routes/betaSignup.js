const express = require('express');
const router = express.Router();
const BetaSignup = require('../models/BetaSignup');
const tokenCheck = require('../utils/tokenCheck');

// Public route - Submit beta signup request
router.post('/submit', async (req, res) => {
  try {
    const { email, name, useCase } = req.body;
    
    // Check if email already exists
    const existingSignup = await BetaSignup.findOne({ email });
    if (existingSignup) {
      return res.status(400).json({ message: 'Email already registered for beta' });
    }

    const betaSignup = new BetaSignup({
      email,
      name,
      useCase
    });

    await betaSignup.save();
    res.status(201).json({ message: 'Beta signup request submitted successfully' });
  } catch (error) {
    console.error('Beta signup error:', error);
    res.status(500).json({ message: 'Error submitting beta signup' });
  }
});

// Admin routes - Protected by tokenCheck
// Get all beta signups
router.get('/all', tokenCheck, async (req, res) => {
  try {
    const signups = await BetaSignup.find().sort({ createdAt: -1 });
    res.json(signups);
  } catch (error) {
    console.error('Error fetching beta signups:', error);
    res.status(500).json({ message: 'Error fetching beta signups' });
  }
});

// Update beta signup status
router.put('/:id', tokenCheck, async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const signup = await BetaSignup.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes },
      { new: true }
    );
    
    if (!signup) {
      return res.status(404).json({ message: 'Beta signup not found' });
    }

    res.json(signup);
  } catch (error) {
    console.error('Error updating beta signup:', error);
    res.status(500).json({ message: 'Error updating beta signup' });
  }
});

// Delete beta signup
router.delete('/:id', tokenCheck, async (req, res) => {
  try {
    const signup = await BetaSignup.findByIdAndDelete(req.params.id);
    
    if (!signup) {
      return res.status(404).json({ message: 'Beta signup not found' });
    }

    res.json({ message: 'Beta signup deleted successfully' });
  } catch (error) {
    console.error('Error deleting beta signup:', error);
    res.status(500).json({ message: 'Error deleting beta signup' });
  }
});

module.exports = router; 