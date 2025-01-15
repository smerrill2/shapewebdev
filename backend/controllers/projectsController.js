const Project = require('../models/Project');
const ProjectVersion = require('../models/ProjectVersion');

exports.getProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.id })
      .populate('versions')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.createProject = async (req, res) => {
  try {
    const { name, components } = req.body;

    const project = new Project({
      name,
      owner: req.user.id
    });

    const version = new ProjectVersion({
      project: project._id,
      versionNumber: 1,
      components
    });

    await version.save();
    project.versions.push(version._id);
    await project.save();

    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getProject = async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.user.id
    }).populate('versions');
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
}; 