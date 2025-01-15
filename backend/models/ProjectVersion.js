const mongoose = require('mongoose');

const projectVersionSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  versionNumber: {
    type: Number,
    required: true,
  },
  components: {
    type: Object,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

module.exports = mongoose.model('ProjectVersion', projectVersionSchema); 