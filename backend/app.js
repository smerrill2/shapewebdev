const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const generateRoutes = require('./routes/generate');
const editRoutes = require('./routes/edit');
const projectRoutes = require('./routes/projects');
const betaSignupRoutes = require('./routes/betaSignup');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/edit', editRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/beta', betaSignupRoutes);

module.exports = app; 