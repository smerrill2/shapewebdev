const express = require('express');
const router = express.Router();
const { componentCache } = require('../utils/componentCache');

// Get all components for a project
router.get('/:projectId', (req, res) => {
  const { projectId } = req.params;
  const components = componentCache.getComponentsForProject(projectId);
  
  if (!components || components.length === 0) {
    return res.status(404).json({ error: 'No components found for this project' });
  }
  
  res.json(components);
});

module.exports = router; 