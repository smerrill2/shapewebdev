const express = require('express');
const router = express.Router();
const tokenCheck = require('../utils/tokenCheck');
const {
  getProjects,
  createProject,
  getProject
} = require('../controllers/projectsController');

router.use(tokenCheck);

router.get('/', getProjects);
router.post('/', createProject);
router.get('/:id', getProject);

module.exports = router; 