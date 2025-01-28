const mongoose = require('mongoose');

const cachedComponentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    index: true
  },
  code: {
    type: String,
    required: true
  },
  parentComponent: {
    type: String,
    index: true
  },
  childComponents: [{
    type: String
  }],
  metadata: {
    isComplete: Boolean,
    componentType: {
      type: String,
      enum: ['navigation', 'hero', 'footer', 'section'],
      required: true
    },
    accessibility: {
      hasAriaLabels: Boolean,
      hasSemanticElements: Boolean,
      hasImgAlts: Boolean
    }
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  versionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProjectVersion',
    required: true
  },
  hash: {
    type: String,
    required: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound indexes for efficient querying
cachedComponentSchema.index({ projectId: 1, name: 1 });
cachedComponentSchema.index({ hash: 1, projectId: 1 });

module.exports = mongoose.model('CachedComponent', cachedComponentSchema); 