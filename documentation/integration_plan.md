## 1. **Proposed File Structure**

```
shapeweb/
├─ backend/
│  ├─ controllers/
│  │  ├─ authController.js
│  │  ├─ generateController.js
│  │  ├─ proposalController.js
│  │  ├─ editController.js
│  │  └─ projectsController.js
│  ├─ models/
│  │  ├─ User.js
│  │  ├─ Project.js
│  │  ├─ ProjectVersion.js
│  │  ├─ Proposal.js
│  │  ├─ ProposalRevision.js
│  │  ├─ CachedComponent.js
│  │  └─ ConversationMessage.js
│  ├─ routes/
│  │  ├─ auth.js
│  │  ├─ generate.js
│  │  ├─ proposals.js
│  │  ├─ edit.js
│  │  └─ projects.js
│  ├─ utils/
│  │  ├─ aiClient.js
│  │  ├─ componentCache.js
│  │  ├─ proposalParser.js
│  │  ├─ componentParser.js
│  │  ├─ tokenCheck.js
│  │  └─ sseHelpers.js
│  ├─ services/
│  │  ├─ ProposalService.js
│  │  ├─ CacheService.js
│  │  └─ GenerationService.js
│  ├─ app.js
│  ├─ database.js
│  └─ server.js
├─ frontend/
│  ├─ src/
│  │  ├─ App.js
│  │  ├─ index.js
│  │  ├─ pages/
│  │  │  ├─ HomePage.jsx
│  │  │  ├─ BetaSignUpPage.jsx
│  │  │  ├─ DashboardPage.jsx
│  │  │  ├─ ProposalPage.jsx
│  │  │  ├─ GeneratePage.jsx
│  │  │  ├─ ProjectEditorPage.jsx
│  │  │  └─ ...
│  │  ├─ components/
│  │  │  ├─ proposal/
│  │  │  │  ├─ ProposalForm.jsx
│  │  │  │  ├─ ProposalPreview.jsx
│  │  │  │  └─ ProposalRevisions.jsx
│  │  │  ├─ cache/
│  │  │  │  ├─ CacheManager.jsx
│  │  │  │  └─ CachedComponentList.jsx
│  │  │  ├─ NavBar.jsx
│  │  │  ├─ ProjectCard.jsx
│  │  │  ├─ LivePreview.jsx
│  │  │  ├─ ComponentHighlighter.jsx
│  │  │  └─ ...
│  │  ├─ context/
│  │  │  ├─ AuthContext.jsx
│  │  │  ├─ ProposalContext.jsx
│  │  │  └─ CacheContext.jsx
│  │  ├─ hooks/
│  │  │  ├─ useProposal.js
│  │  │  ├─ useCache.js
│  │  │  └─ useComponentGeneration.js
│  │  └─ services/
│  │     ├─ apiService.js
│  │     ├─ proposalService.js
│  │     └─ cacheService.js
│  ├─ public/
│  ├─ package.json
│  └─ ...
├─ documentation/
│  ├─ integration_plan.md
│  ├─ proposal_flow.md
│  ├─ caching_system.md
│  └─ api_docs.md
├─ .env
├─ package.json
└─ ...
```

- **backend/**: Node.js/Express application that handles authentication, token management, SSE endpoints, DB queries, etc.  
- **frontend/**: React app that renders the user interface, calls back-end endpoints, handles real-time rendering, etc.  

---

# 2. **Backend Details**

## 2.1 **Database Layer (Postgres)**

You can use **Prisma**, **Sequelize**, or **Knex** to manage migrations and queries.  
Here's a **pseudo-SQL** schema:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'approved' once admin decides
  tokens_remaining INT DEFAULT 250,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  title VARCHAR(255),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE project_versions (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL REFERENCES projects(id),
  version_number INT NOT NULL,
  code TEXT NOT NULL,  -- store the entire JSON or raw code as text
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE cached_components (
  id SERIAL PRIMARY KEY,
  project_version_id INT NOT NULL REFERENCES project_versions(id),
  name VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  metadata JSONB,  -- Store component metadata (dependencies, isMain, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_component_name ON cached_components(name);
CREATE INDEX idx_project_version ON cached_components(project_version_id);
```

### **Example Model (Sequelize)**

```js
// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const User = sequelize.define('User', {
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  tokens_remaining: { type: DataTypes.INTEGER, defaultValue: 250 },
});

module.exports = User;
```

> Similarly, define `Project.js` and `ProjectVersion.js`.

## 2.2 **Express App Setup**

```js
// app.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const authRoutes = require('./routes/auth');
const generateRoutes = require('./routes/generate');
const editRoutes = require('./routes/edit');
const projectRoutes = require('./routes/projects');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Example: auth routes
app.use('/api/auth', authRoutes);
app.use('/api/generate', generateRoutes);
app.use('/api/edit', editRoutes);
app.use('/api/projects', projectRoutes);

module.exports = app;
```

### **Server Entrypoint**

```js
// server.js
const app = require('./app');
const { sequelize } = require('./database'); // if using Sequelize

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await sequelize.sync(); // or sequelize.authenticate() / migrations
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
  }
})();
```

## 2.3 **Authentication & Beta Flow**

### **authController.js**

```js
const { User } = require('../models');

exports.signUpBeta = async (req, res) => {
  try {
    const { email } = req.body;
    // Create new user with status 'pending'
    const newUser = await User.create({ email });
    // Here you might integrate with Zoho for email confirmation
    return res.json({ message: 'Beta signup successful!', user: newUser });
  } catch (error) {
    return res.status(400).json({ error: 'Error signing up for beta' });
  }
};

exports.approveUser = async (req, res) => {
  // For admin usage: sets status='approved'
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId);
    user.status = 'approved';
    await user.save();
    return res.json({ message: 'User approved', user });
  } catch (error) {
    return res.status(400).json({ error: 'Error approving user' });
  }
};
```

## 2.4 **Admin Dashboard**

### **AdminDashboard.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';

const AdminDashboard = () => {
  const [signups, setSignups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchSignups();
  }, []);

  const fetchSignups = async () => {
    try {
      const response = await axios.get('/api/beta/all');
      setSignups(response.data);
      setLoading(false);
    } catch (error) {
      setError('Failed to fetch beta signups');
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await axios.put(`/api/beta/${id}`, { status: newStatus });
      fetchSignups(); // Refresh the list
    } catch (error) {
      setError('Failed to update status');
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Beta Signup Management</h1>
      
      <div className="grid gap-6">
        {signups.map((signup) => (
          <div key={signup._id} className="bg-card p-6 rounded-lg shadow-sm border">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-xl font-semibold">{signup.name}</h3>
                <p className="text-muted-foreground">{signup.email}</p>
                <p className="mt-2">{signup.useCase}</p>
                <p className="mt-2 text-sm">
                  Applied: {new Date(signup.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    variant={signup.status === 'pending' ? 'outline' : 'ghost'}
                    onClick={() => handleStatusUpdate(signup._id, 'pending')}
                  >
                    Pending
                  </Button>
                  <Button
                    variant={signup.status === 'approved' ? 'outline' : 'ghost'}
                    onClick={() => handleStatusUpdate(signup._id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant={signup.status === 'rejected' ? 'outline' : 'ghost'}
                    onClick={() => handleStatusUpdate(signup._id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDashboard;
```

### **betaSignup.js (Route)**

```js
const express = require('express');
const router = express.Router();
const BetaSignup = require('../models/BetaSignup');
const tokenCheck = require('../utils/tokenCheck');

// Admin routes - Protected by tokenCheck
router.get('/all', tokenCheck, async (req, res) => {
  try {
    const signups = await BetaSignup.find().sort({ createdAt: -1 });
    res.json(signups);
  } catch (error) {
    console.error('Error fetching beta signups:', error);
    res.status(500).json({ message: 'Error fetching beta signups' });
  }
});

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

module.exports = router;
```

### **BetaSignup.js (Model)**

```js
const mongoose = require('mongoose');

const betaSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  useCase: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  adminNotes: {
    type: String,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BetaSignup', betaSignupSchema);
```

The admin dashboard provides a clean interface for managing beta signups with the following features:

1. View all beta signups in a list format
2. See detailed information for each signup:
   - Name
   - Email
   - Use case description
   - Application date
3. Manage signup status:
   - Set as Pending
   - Approve
   - Reject
4. Protected routes using tokenCheck middleware
5. Real-time updates when status changes
6. Styled using shadcn/ui components for consistency

## 2.5 **Generation (SSE)**

### **generateController.js**

```js
const { decrementTokens } = require('../utils/tokenCheck');
const { streamClaude } = require('../utils/aiClient');
const { createSSEHeader } = require('../utils/sseHelpers');

exports.generateLandingPage = async (req, res) => {
  try {
    const user = req.user; // after some auth check
    // Check if user has enough tokens
    if (user.tokens_remaining < 50) {
      return res.status(403).json({ error: 'Not enough tokens' });
    }

    // Decrement 50 tokens upfront
    await decrementTokens(user, 50);

    // SSE Setup
    createSSEHeader(res);

    // Construct your prompt for Claude
    const userPrompt = req.body.prompt;
    const aiPrompt = `Generate a landing page with the following details: ${userPrompt} ...`;

    // streamClaude is a function that calls Claude's streaming API
    await streamClaude(aiPrompt, (chunk) => {
      // For each chunk from Claude, send SSE event
      res.write(`data: ${chunk}\n\n`);
    });

    // Finish SSE
    res.end();
  } catch (err) {
    console.error(err);
    res.end();
  }
};
```

### **generate.js (Route)**

```js
const express = require('express');
const router = express.Router();
const generateController = require('../controllers/generateController');
const tokenCheckMiddleware = require('../utils/tokenCheck');

// POST /api/generate
router.post('/', tokenCheckMiddleware, generateController.generateLandingPage);

module.exports = router;
```

## 2.6 **Edit (SSE)**

### **editController.js**

```js
const { decrementTokens } = require('../utils/tokenCheck');
const { streamClaude } = require('../utils/aiClient');
const { createSSEHeader } = require('../utils/sseHelpers');

exports.editComponent = async (req, res) => {
  try {
    const user = req.user;
    // E.g., 5 tokens per edit
    if (user.tokens_remaining < 5) {
      return res.status(403).json({ error: 'Not enough tokens' });
    }
    await decrementTokens(user, 5);

    createSSEHeader(res);

    const { codeSnippet, userInstruction } = req.body;

    // Construct a minimal prompt to get the updated snippet
    const aiPrompt = `Here is some React code:\n${codeSnippet}\n\nUser wants: ${userInstruction}\nReturn updated code only.`;

    await streamClaude(aiPrompt, (chunk) => {
      res.write(`data: ${chunk}\n\n`);
    });

    res.end();
  } catch (err) {
    console.error(err);
    res.end();
  }
};
```

### **edit.js (Route)**

```js
const express = require('express');
const router = express.Router();
const editController = require('../controllers/editController');
const tokenCheckMiddleware = require('../utils/tokenCheck');

router.post('/', tokenCheckMiddleware, editController.editComponent);

module.exports = router;
```

## 2.7 **Projects & Versions**

### **projectsController.js**

```js
const { Project, ProjectVersion } = require('../models');

exports.createProject = async (req, res) => {
  try {
    const user = req.user;
    const { title, code } = req.body;

    // Create new project
    const project = await Project.create({ user_id: user.id, title });

    // Create first version
    await ProjectVersion.create({
      project_id: project.id,
      version_number: 1,
      code
    });

    return res.json({ project });
  } catch (err) {
    return res.status(400).json({ error: 'Error creating project' });
  }
};

exports.getUserProjects = async (req, res) => {
  try {
    const user = req.user;
    const projects = await Project.findAll({ where: { user_id: user.id } });
    return res.json({ projects });
  } catch (err) {
    return res.status(400).json({ error: 'Error fetching projects' });
  }
};

exports.getProjectVersions = async (req, res) => {
  try {
    const { projectId } = req.params;
    const versions = await ProjectVersion.findAll({ where: { project_id: projectId } });
    return res.json({ versions });
  } catch (err) {
    return res.status(400).json({ error: 'Error fetching versions' });
  }
};

exports.saveNewVersion = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { code } = req.body;

    // Find the latest version_number
    const lastVersion = await ProjectVersion.findOne({
      where: { project_id: projectId },
      order: [['version_number', 'DESC']]
    });

    const newVersionNumber = lastVersion ? lastVersion.version_number + 1 : 1;

    const newVersion = await ProjectVersion.create({
      project_id: projectId,
      version_number: newVersionNumber,
      code
    });

    return res.json({ newVersion });
  } catch (err) {
    return res.status(400).json({ error: 'Error saving new version' });
  }
};
```

### **projects.js (Route)**

```js
const express = require('express');
const router = express.Router();
const projectsController = require('../controllers/projectsController');
const tokenCheckMiddleware = require('../utils/tokenCheck');

// Create project
router.post('/', tokenCheckMiddleware, projectsController.createProject);
// Get all projects for a user
router.get('/', tokenCheckMiddleware, projectsController.getUserProjects);
// Get versions of a specific project
router.get('/:projectId/versions', tokenCheckMiddleware, projectsController.getProjectVersions);
// Save new version
router.post('/:projectId/versions', tokenCheckMiddleware, projectsController.saveNewVersion);

module.exports = router;
```

## 2.8 **Token Check Middleware**

```js
// utils/tokenCheck.js
const { User } = require('../models');

module.exports = async function tokenCheckMiddleware(req, res, next) {
  // Imagine you did some auth, found user id in a JWT/cookie
  const userId = req.headers['x-user-id'] || null; 
  if (!userId) {
    return res.status(401).json({ error: 'Not authorized' });
  }
  
  const user = await User.findByPk(userId);
  if (!user || user.status !== 'approved') {
    return res.status(403).json({ error: 'User not approved or does not exist' });
  }
  
  req.user = user; // attach user to request
  next();
};

// decrementTokens
exports.decrementTokens = async (user, amount) => {
  user.tokens_remaining -= amount;
  await user.save();
};
```

## 2.9 **Integrating with Claude**

```js
// utils/aiClient.js
const axios = require('axios');

exports.streamClaude = async function (prompt, onChunk) {
  // Example using a hypothetical SSE endpoint from Anthropic/Claude
  // This code is pseudo-code, adapt to the actual SSE interface
  const response = await axios.post('https://api.anthropic.com/v1/complete', {
    prompt,
    max_tokens_to_sample: 2000,
    // ... other Claude config
  }, {
    responseType: 'stream', // so we can read chunks
    headers: { Authorization: `Bearer ${process.env.CLAUDE_API_KEY}` }
  });

  response.data.on('data', (chunk) => {
    const chunkStr = chunk.toString();
    // parse the chunk or stream it directly
    onChunk(chunkStr);
  });

  return new Promise((resolve, reject) => {
    response.data.on('end', () => resolve());
    response.data.on('error', (err) => reject(err));
  });
};
```

## 2.10 **SSE Helpers**

```js
// utils/sseHelpers.js
exports.createSSEHeader = (res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
};
```

## 2.11 **Core Component Implementations**

### **LivePreview.jsx**

The LivePreview component is responsible for rendering the generated components in real-time:

```jsx
import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { twMerge as cn } from 'tailwind-merge';
import * as lucideIcons from 'lucide-react';
import * as Babel from '@babel/standalone';

// Error Boundary Component
class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Component render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-400 text-sm bg-red-950/20 rounded-lg">
          <p className="font-medium">Failed to render component:</p>
          <pre className="mt-2 text-xs overflow-auto">{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

// LivePreview Component
const LivePreview = ({ components = [] }) => {
  const [evaluatedComponents, setEvaluatedComponents] = useState([]);
  const evaluationCache = useRef(new Map());
  const [completedComponents, setCompletedComponents] = useState(new Set());

  const evaluateComponent = useCallback(async (component) => {
    let codeToEval;
    try {
      if (evaluationCache.current.has(component.name)) {
        return evaluationCache.current.get(component.name);
      }

      codeToEval = component.streamedCode || component.code;
      if (!codeToEval) {
        throw new Error(`No code available for component ${component.name}`);
      }

      // Extract all component definitions
      const componentRegex = /\/\*\s*Component:\s*([A-Za-z0-9]+)\s*\*\/[\s\S]*?(?=\/\*\s*Component:|$)/g;
      const componentMatches = [...codeToEval.matchAll(componentRegex)];

      // Create a map of all component definitions
      const componentDefinitions = {};
      componentMatches.forEach(match => {
        const name = match[1];
        let code = match[0]
          .replace(/import\s+.*?from\s*['"].*?['"];?\s*/g, '')
          .replace(/export\s+default\s+\w+\s*;?/g, '')
          .replace(/export\s+{\s*[^}]+\s*}\s*;?/g, '')
          .replace(/export\s+\w+\s*;?/g, '')
          .replace(/\bexport\s+/g, '')
          .replace(/\/\*\s*Component:\s*[A-Za-z0-9]+\s*\*\//, '')
          .trim();

        componentDefinitions[name] = code;
      });

      // Check for component dependencies
      const jsxComponentRegex = /<([A-Z][a-zA-Z0-9]*)/g;
      const dependencies = new Set();
      Object.entries(componentDefinitions).forEach(([name, code]) => {
        const matches = [...code.matchAll(jsxComponentRegex)];
        matches.forEach(match => {
          const dependency = match[1];
          if (dependency !== name) {
            dependencies.add(dependency);
          }
        });
      });

      // Check if all dependencies are available
      for (const dependency of dependencies) {
        if (!componentDefinitions[dependency] && !evaluationCache.current.has(dependency)) {
          throw new Error(`Component ${component.name} depends on ${dependency} which is not yet available`);
        }
      }

      // Create the evaluation code with all dependencies
      const wrappedCode = `
        (function(React, lucideIcons, cn) {
          const { useState, useEffect, useCallback, useMemo, useRef, createElement, Fragment } = React;
          
          // Define all dependencies first
          ${[...dependencies].map(dep => {
            if (componentDefinitions[dep]) {
              return `const ${dep} = ${componentDefinitions[dep].replace(/const\s+(\w+)\s*=/, '')};`;
            }
            return `const ${dep} = ${evaluationCache.current.get(dep).Component.toString()};`;
          }).join('\n\n')}
          
          // Define the requested component
          ${componentDefinitions[component.name].replace(/const\s+(\w+)\s*=/, `const ${component.name} =`)}
          
          return ${component.name};
        })(React, lucideIcons, cn)
      `;

      // Transform and evaluate
      const transformedCode = Babel.transform(wrappedCode, {
        presets: ['react'],
        filename: component.name
      }).code;

      const ComponentClass = (new Function('React', 'lucideIcons', 'cn', `return ${transformedCode}`))(
        React,
        lucideIcons,
        cn
      );

      if (!ComponentClass) {
        throw new Error(`Component ${component.name} evaluated to undefined`);
      }

      const result = {
        name: component.name,
        Component: ComponentClass,
        timestamp: Date.now(),
        metadata: {
          componentType: component.name.toLowerCase().includes('nav') ? 'navigation' :
                        component.name.toLowerCase().includes('hero') ? 'hero' :
                        component.name.toLowerCase().includes('footer') ? 'footer' : 'section',
          parentComponent: null,
          isComponent: true
        },
        children: []
      };

      evaluationCache.current.set(component.name, result);
      return result;

    } catch (error) {
      console.error(`[${component.name}] Evaluation error:`, error);
      const errorLocation = error.loc ? 
        codeToEval.split('\n').slice(Math.max(0, error.loc.line - 3), error.loc.line + 2).join('\n') :
        codeToEval;
      
      return {
        name: component.name,
        error: `${error.message}\n\nNearby code:\n${errorLocation}`,
        codePreview: codeToEval?.slice(0, 500),
        metadata: { componentType: 'unknown', parentComponent: null }
      };
    }
  }, []);

  // Effect to handle component evaluation as they stream in
  useEffect(() => {
    // Process each component individually
    components.forEach(async (component) => {
      // Skip if we've already processed this exact component state
      const cacheKey = `${component.name}-${component.code}`;
      if (completedComponents.has(cacheKey)) return;

      // Only evaluate if the component is complete or we haven't seen it before
      if (component.isComplete || !evaluationCache.current.has(component.name)) {
        try {
          const evaluatedComponent = await evaluateComponent(component);
          
          if (evaluatedComponent) {
            setEvaluatedComponents(prev => {
              // Remove old version of this component if it exists
              const filtered = prev.filter(c => c.name !== component.name);
              return [...filtered, evaluatedComponent];
            });

            if (component.isComplete) {
              setCompletedComponents(prev => new Set(prev).add(cacheKey));
            }
          }
        } catch (error) {
          console.error(`Error evaluating ${component.name}:`, error);
        }
      }
    });
  }, [components, evaluateComponent]);

  return (
    <div className="w-full bg-[#0B1121] rounded-lg overflow-hidden">
      <div className="w-full relative">
        {evaluatedComponents.length === 0 && components.length > 0 && (
          <div className="p-4 text-amber-400 text-sm bg-amber-950/20 rounded-lg">
            <p className="font-medium">Evaluating components...</p>
          </div>
        )}
        {evaluatedComponents.map((component, index) => (
          <MemoizedComponent
            key={`${component.name}-${component.timestamp}`}
            component={component}
            index={index}
            total={evaluatedComponents.length}
          />
        ))}
      </div>
    </div>
  );
};

export default memo(LivePreview);
```

### **GeneratePage.jsx**

The GeneratePage component handles the generation flow and component streaming:

```jsx
import React, { useState, useCallback, useReducer, useRef, useEffect } from 'react';
import { Card } from '../components/ui/card';
import LivePreview from '../components/LivePreview';
import AnimatedPreview from '../components/AnimatedPreview';
import GenerateSidebar from '../components/GenerateSidebar';
import { cn } from '../lib/utils';

// Initial state
const initialState = {
  stream: {
    status: 'idle',
    error: null,
    buffer: '',
    currentBlock: null,
    retryCount: 0,
    lastSuccessfulConnection: 0,
    healthMetrics: {
      lastMessageTime: 0,
      messagesReceived: 0,
      errorCount: 0,
      reconnectAttempts: 0
    }
  },
  components: {
    list: [],
    activeIndex: -1,
    transitions: {
      from: null,
      to: null,
      status: 'idle',
      timestamp: 0
    },
    evaluationStatus: {}
  },
  thoughts: {
    list: [],
    buffer: '',
    lastProcessed: null
  }
};

const GeneratePage = () => {
  const [state, dispatch] = useReducer(generateReducer, initialState);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasStartedGeneration, setHasStartedGeneration] = useState(false);
  const [showAnimatedPreview, setShowAnimatedPreview] = useState(true);
  
  const streamProcessor = useRef(null);
  const evaluationQueue = useRef(null);

  // Enhanced submit handler with stream processing
  const handleSubmit = async ({ prompt, style, requirements }) => {
    try {
      setIsGenerating(true);
      setHasStartedGeneration(true);
      
      dispatch({ 
        type: 'STREAM_UPDATE', 
        payload: { status: 'connecting' } 
      });

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, style, requirements })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      dispatch({ 
        type: 'STREAM_UPDATE', 
        payload: { status: 'connected' } 
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          if (line.trim() === '') continue;
          
          const match = line.match(/^data:\s*(?:data:\s*)?(.+)$/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              if (data && typeof data === 'object') {
                handleStreamMessage(data);
              }
            } catch (err) {
              console.error('Error parsing SSE JSON:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error during generation:', error);
      handleStreamError(error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen">
      <GenerateSidebar 
        className="w-96 shrink-0"
        onSubmit={handleSubmit}
        isGenerating={state.stream.status === 'streaming'}
        hasStartedGeneration={state.stream.status !== 'idle'}
        thoughts={state.thoughts.list}
        components={state.components.list}
        activeComponentIndex={state.components.activeIndex}
        streamStatus={state.stream.status}
        onSelect={(index) => dispatch({ type: 'SET_ACTIVE_COMPONENT', payload: { index } })}
      />
      
      <main className="flex-1 p-6 bg-[#0B1121]">
        <div className="h-full flex flex-col">
          {showAnimatedPreview && state.components.list.length > 0 ? (
            <div className="space-y-4">
              {state.components.list.map((component, index) => (
                <AnimatedPreview
                  key={component.name}
                  code={component.code}
                  streamedCode={component.streamedCode}
                  isComplete={component.isComplete}
                  isStreaming={component.isStreaming}
                  componentName={component.name}
                />
              ))}
            </div>
          ) : (
            <div className="w-[90%] mx-auto rounded-lg overflow-hidden shadow-2xl">
              <div className="w-full h-8 bg-[#1A1F2E] flex items-center px-4 gap-2">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                </div>
              </div>
              <LivePreview 
                components={state.components.list}
                className="w-full"
              />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default GeneratePage;
```

### **aiClient.js**

The AI client handles communication with the Claude API and processes the streaming responses:

```javascript
const axios = require('axios');
const { Readable } = require('stream');

// Helper to properly format SSE data
const formatSSE = (data) => {
  try {
    // Format thought messages
    if (data.type === 'thought' || data.type === 'message_start') {
      return `data: ${JSON.stringify({
        type: data.type,
        content: data.content || data.thought
      })}\n\n`;
    }
    
    // Format content block messages
    if (data.type === 'content_block_delta' || data.type === 'content_block_start') {
      return `data: ${JSON.stringify({
        type: data.type,
        delta: data.delta || {},
        metadata: data.metadata || {},
        index: data.index
      })}\n\n`;
    }

    // Format completion messages
    if (data.type === 'content_block_stop' || data.type === 'message_stop') {
      return `data: ${JSON.stringify({
        type: data.type,
        index: data.index
      })}\n\n`;
    }

    // Format error messages
    if (data.type === 'error') {
      return `data: ${JSON.stringify({
        type: 'error',
        error: data.error
      })}\n\n`;
    }

    // Format message delta events
    if (data.type === 'message_delta') {
      return `data: ${JSON.stringify({
        type: 'message_delta',
        delta: data.delta,
        usage: data.usage
      })}\n\n`;
    }

    // Default case - pass through the data
    return `data: ${JSON.stringify(data)}\n\n`;
  } catch (error) {
    console.error('Error formatting SSE data:', error);
    return `data: ${JSON.stringify({ type: 'error', error: 'Error formatting response' })}\n\n`;
  }
};

// Main generate function
module.exports = {
  generate: async function({ prompt, style, requirements }) {
    try {
      console.log('Starting generation with:', { 
        prompt: prompt?.slice(0, 100), 
        hasStyle: !!style, 
        hasRequirements: !!requirements 
      });
      
      const stream = new Readable({
        read() {}
      });

      let fullPrompt = `You are a highly creative web developer specialized in creating stunning, unique React landing pages. Your task is to generate an innovative and visually striking landing page that pushes the boundaries of modern web design.

CRITICAL COMPONENT REQUIREMENTS:
1. Components MUST follow this hierarchy:
   - HeroSection as the root component (contains Navbar)
   - Navbar as a child of HeroSection
   - Content sections as siblings
   - Footer as the last component

2. Component Relationships:
   - ALWAYS use /* Parent: ParentComponentName */ comment to specify parent components
   - Navbar MUST be a child of HeroSection
   - Other components can be root level unless explicitly nested

3. Component Containment:
   - Each component MUST handle its own layout and spacing
   - Navigation MUST stay within HeroSection bounds
   - Content sections MUST not overflow their containers
   - Use Tailwind's container utilities for consistent content width

4. Component Structure:
   - Each component in separate code block
   - Use semantic HTML (header, nav, section, footer)
   - Export as default only
   - Include all necessary imports

${prompt}${style ? `\nStyle preferences: ${style}` : ''}${requirements ? `\nSpecific requirements: ${requirements}` : ''}`;

      let attempt = 0;
      let response;

      while (attempt < 3) {
        try {
          response = await axios({
            method: 'post',
            url: 'https://api.anthropic.com/v1/messages',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': process.env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01',
              'accept': 'text/event-stream'
            },
            data: {
              model: 'claude-3-haiku-20240307',
              messages: [{
                role: 'user',
                content: [{
                  type: 'text',
                  text: fullPrompt
                }]
              }],
              stream: true,
              max_tokens: 4000,
              temperature: 0.7
            },
            responseType: 'stream'
          });
          
          break; // Success, exit retry loop
        } catch (error) {
          attempt++;
          if (attempt === 3) throw error;
          
          // Handle rate limiting
          if (error.response?.status === 429) {
            const delay = backoff(attempt);
            console.log(`Rate limited, waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      await processAnthropicStream(response, stream);
      return stream;

    } catch (error) {
      console.error('Generation error:', error);
      const stream = new Readable({
        read() {}
      });
      stream.push(formatSSE({
        type: 'error',
        error: `Generation failed: ${error.message}`
      }));
      stream.push(null);
      return stream;
    }
  }
};
```

These implementations work together to:
1. Generate components using Claude API
2. Stream the generated code in real-time
3. Evaluate and render components as they arrive
4. Handle errors and component dependencies
5. Manage component state and transitions
6. Provide real-time feedback to users

The system is designed to be robust, with:
- Error boundaries for component rendering
- Retry logic for API calls
- Stream health monitoring
- Component dependency resolution
- Clean state management
- Efficient caching
```

---

# 3. **Front-End Details**

## 3.1 **High-Level Workflow**

1. **Beta Sign-Up Page**:  
   - Minimal form → calls `POST /api/auth/beta-signup`.  
2. **Dashboard Page**:  
   - After user is approved and logged in, calls `GET /api/projects` to fetch their projects.  
   - "Create New Landing Page" → navigates to Generate Page.  
3. **Generate Page**:  
   - Text field for prompt → on submission, calls `POST /api/generate`.  
   - Listens to SSE. As chunks arrive, build up the code in state and visually render.  
   - "Accept" → calls `POST /api/projects` with final code.  
4. **Project Editor Page**:  
   - Shows the last accepted version.  
   - Hover + highlight components → user opens "chat bubble" → sends code snippet + user instruction to `POST /api/edit` SSE.  
   - Receive updated code → re-render.  
   - "Save Changes" → `POST /api/projects/:projectId/versions`.

## 3.2 **Example React Components**

### **`GeneratePage.jsx`**

```jsx
import React, { useState, useRef } from 'react';
import { startSSE } from '../services/apiService';

const GeneratePage = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const sseRef = useRef(null);

  const handleGenerate = () => {
    setGeneratedCode('');
    // SSE request
    sseRef.current = startSSE('/api/generate', { prompt }, (chunk) => {
      // Update code as it streams in
      setGeneratedCode((prev) => prev + chunk);
    });
  };

  const handleStop = () => {
    if (sseRef.current) sseRef.current.close();
  };

  const handleAccept = async () => {
    // Post to /api/projects to create project + version
    const response = await fetch('/api/projects', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': localStorage.getItem('userId') // example
      },
      body: JSON.stringify({ title: 'My Landing Page', code: generatedCode })
    });
    // Then redirect to Project Editor
  };

  return (
    <div>
      <h1>Generate Landing Page</h1>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe your landing page..."
      />
      <button onClick={handleGenerate}>Generate</button>
      <button onClick={handleStop}>Stop</button>
      <pre>{generatedCode}</pre>
      <button onClick={handleAccept}>Accept</button>
    </div>
  );
};

export default GeneratePage;
```

### **`apiService.js`** (SSE Helper)

```js
export function startSSE(endpoint, body, onMessage) {
  // Using fetch() to initiate SSE
  const url = endpoint; // e.g. '/api/generate'
  const fetchParams = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': localStorage.getItem('userId')
    },
    body: JSON.stringify(body)
  };

  const eventSource = new EventSourcePolyfill(url, fetchParams);

  eventSource.onmessage = (event) => {
    onMessage(event.data);
  };

  eventSource.onerror = (err) => {
    console.error('SSE error', err);
    eventSource.close();
  };

  return eventSource;
}
```

> **Note**: You may need an SSE polyfill, or you can handle streaming responses via `fetch()` + `ReadableStream` in modern browsers.

### **`ProjectEditorPage.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { getProjectCode, startSSE } from '../services/apiService';

const ProjectEditorPage = ({ projectId }) => {
  const [code, setCode] = useState('');
  const [selectedSnippet, setSelectedSnippet] = useState('');
  const [userInstruction, setUserInstruction] = useState('');

  useEffect(() => {
    // Fetch latest version from backend
    async function fetchData() {
      const data = await getProjectCode(projectId);
      setCode(data.code);
    }
    fetchData();
  }, [projectId]);

  // Example: highlight component logic
  const handleHighlight = (snippet) => {
    setSelectedSnippet(snippet);
  };

  const handleEdit = () => {
    // SSE to /api/edit
    startSSE('/api/edit', { codeSnippet: selectedSnippet, userInstruction }, (chunk) => {
      // accumulate chunk
      setCode((prev) => prev + chunk);
    });
  };

  const handleSaveVersion = async () => {
    const response = await fetch(`/api/projects/${projectId}/versions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': localStorage.getItem('userId')
      },
      body: JSON.stringify({ code })
    });
    const data = await response.json();
    console.log('Saved version:', data);
  };

  return (
    <div>
      <h1>Editing Project {projectId}</h1>
      <div>
        <button>Desktop</button>
        <button>Tablet</button>
        <button>Mobile</button>
      </div>

      {/* LivePreview is a specialized component that can parse "code" and render the result */}
      <LivePreview code={code} onComponentHover={handleHighlight} />

      <div>
        <textarea
          placeholder="What do you want to change?"
          value={userInstruction}
          onChange={(e) => setUserInstruction(e.target.value)}
        />
        <button onClick={handleEdit}>Apply Edit</button>
      </div>

      <button onClick={handleSaveVersion}>Save Version</button>
    </div>
  );
};

export default ProjectEditorPage;
```

### **`LivePreview.jsx`** (Pseudo Implementation)

```jsx
import React from 'react';
import Babel from '@babel/standalone';

const LivePreview = ({ code, onComponentHover }) => {
  // Use Babel.transform to convert string code to something you can evaluate or
  // a dynamic import. This is advanced and has security implications (sandboxing!).

  // For highlighting, you might parse the code, wrap components in a <div onMouseOver={() => onComponentHover(snippet)}>

  let compiledCode = '';
  try {
    compiledCode = Babel.transform(code, { presets: ['env', 'react'] }).code;
  } catch (err) {
    console.error('Babel transform error:', err);
  }

  // Evaluate compiled code in a safe-ish environment
  // For MVP, you might do something naive like new Function(...) but be careful with security.

  return (
    <div>
      {/* Here you might dangerously set inner HTML or create a dynamic component */}
      {/* This is just conceptual */}
      <div dangerouslySetInnerHTML={{ __html: 'Rendered output of your code...' }} />
    </div>
  );
};

export default LivePreview;
```

> A more robust approach would be to build a custom real-time code sandbox or rely on an existing library (like React Live or CodeMirror + React Preview).  

---

# 4. **Multi-Breakpoint Preview**

- Simple approach: keep a **wrapper div** whose width is toggled by the user:

```jsx
const [previewWidth, setPreviewWidth] = useState('100%');

const handleDesktop = () => setPreviewWidth('1200px');
const handleTablet = () => setPreviewWidth('768px');
const handleMobile = () => setPreviewWidth('375px');

// Then in your render:
<div style={{ width: previewWidth }}>
  <LivePreview code={code} ... />
</div>
```

---

# 5. **Versioning**

1. **On Accept** (from GeneratePage)  
   - Create a project + first version.  
2. **On Each Edit** (from ProjectEditor)  
   - If user clicks "Save Changes," you do a `POST /api/projects/:projectId/versions`.  
   - This increments the version number and stores the new code in `project_versions`.  
3. **Revert** (optional for MVP)  
   - Provide a list of versions. If user wants to revert, fetch that code and store as a **new** version.  

---

# 6. **Design Agent (MVP)**

- **Front-End**: A button or command palette: 
  ```jsx
  <button onClick={() => askDesignAgent()}>Ask Design Agent</button>
  ```
- **Back-End**: Possibly re-use the `/api/edit` or add a new endpoint `/api/design-agent`.  
- **Flow**:  
  1. Send entire code + a "design review" prompt to Claude.  
  2. Return suggestions or updated code.  
  3. User chooses to apply or discard.  

> For an MVP, keep it minimal. Maybe just show textual suggestions before applying changes.

---

# 7. **Export to GitHub**

- **Future**: Set up OAuth with GitHub, store user's OAuth tokens, and create a new repo or gist via [GitHub REST API](https://docs.github.com/en/rest).  
- **MVP**: A "Download Code" button that compiles the code into a `.zip`.

---

# 8. **Putting It All Together**

**User Workflow**:  
1. **Sign Up** for Beta → Wait for Approval → Admin updates status in DB.  
2. **Login** (or pass `x-user-id` in headers for testing).  
3. **Dashboard**: Sees list of projects.  
4. **Generate** a new landing page → SSE → watch code appear in a live preview → Accept → project created.  
5. **Edit** the page → hover + highlight snippet → instruct AI → SSE → updated code → user clicks "Save" → new version stored.  
6. **Design Agent**: Optionally ask for a review.  

You now have a **front-end** that is streaming partial code from **Claude** via SSE, and a **back-end** that manages **tokens**, **projects**, and **versions** in **Postgres**. Lazy-load your icons, incorporate **ShadCN** UI components where needed for a polished design, and store images (if needed) in an **S3 bucket**.

**Performance Considerations**: For an alpha, you can run everything on a small server. Optimize only if you notice big lag or scaling issues.

---

## **Next Steps**

1. **Implement the Database** (Prisma / Sequelize / raw SQL).  
2. **Set Up the SSE** endpoints carefully. Test chunk-by-chunk streaming from Claude's real API.  
3. **Front-End**:  
   - Build the `GeneratePage` to handle SSE.  
   - Create the `ProjectEditorPage` for live preview + highlight + chat bubble.  
   - Use Babel or a safe sandbox for rendering dynamic code.  
4. **QA**: Thoroughly test the flow from sign-up → generate → edit → version save.  
5. **Polish**: Add ShadCN UI components for consistent styling, brand it as **ShapeWeb.dev**.  

With these **concrete examples** and **file structures**, you have a clear path to implement the MVP. You can give this blueprint to **Cursor IDE** to scaffold the project, generate code stubs, and fill in the SSE logic. Then iterate quickly to get user feedback. 

**Good luck building your AI-powered website generator!**

# 9. **Icon System Implementation**

## 9.1 **Icon Registry Setup**

We implemented a two-tier icon system that combines instant access to commonly used icons with dynamic loading for less common ones:

```typescript
// utils/iconRegistry.js
import * as LucideIcons from 'lucide-react';

// Pre-bundled icons that are commonly used
export const preBundledIcons = {
  // Navigation
  ChevronRight: LucideIcons.ChevronRight,
  ChevronLeft: LucideIcons.ChevronLeft,
  ChevronUp: LucideIcons.ChevronUp,
  ChevronDown: LucideIcons.ChevronDown,
  ArrowRight: LucideIcons.ArrowRight,
  ArrowLeft: LucideIcons.ArrowLeft,
  Menu: LucideIcons.Menu,
  
  // Actions
  Plus: LucideIcons.Plus,
  Minus: LucideIcons.Minus,
  X: LucideIcons.X,
  Check: LucideIcons.Check,
  Search: LucideIcons.Search,
  Settings: LucideIcons.Settings,
  
  // Common
  User: LucideIcons.User,
  Mail: LucideIcons.Mail,
  Calendar: LucideIcons.Calendar,
  Clock: LucideIcons.Clock,
  Home: LucideIcons.Home,
  
  // Status/Feedback
  AlertCircle: LucideIcons.AlertCircle,
  CheckCircle: LucideIcons.CheckCircle,
  XCircle: LucideIcons.XCircle,
  Info: LucideIcons.Info,
  Loader: LucideIcons.Loader2
};
```

## 9.2 **LivePreview Integration**

The key to making icons work in the live preview environment was setting up the sandbox correctly:

```typescript
// components/LivePreview.jsx
import * as LucideIcons from 'lucide-react';

const sandbox = {
  React,
  Button,
  // ... other UI components ...
  // Add all Lucide icons to sandbox
  ...LucideIcons,
  exports: {},
  module: { exports: {} },
  require: (module) => {
    switch (module) {
      case 'react':
        return React;
      case 'lucide-react':
        return LucideIcons;
      default:
        throw new Error(`Module ${module} not found in sandbox`);
    }
  }
};
```

## 9.3 **Testing Components**

We created test components to verify both pre-bundled and dynamically loaded icons:

```typescript
// components/TestAIResponse.jsx
const RareIconsDemo = () => {
  return (
    <div className="space-y-6 p-6 bg-white rounded-lg shadow">
      {/* Rare/Dynamic Icons */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <Bike className="w-8 h-8 text-blue-500 mb-2" />
          <span className="text-sm">Bike Rental</span>
        </div>
        <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
          <Pizza className="w-8 h-8 text-orange-500 mb-2" />
          <span className="text-sm">Food Delivery</span>
        </div>
      </div>

      {/* Common/Pre-bundled Icons */}
      <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-500" />
          <span>Settings</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-6 h-6 text-red-500" />
          <span>Profile</span>
        </div>
      </div>
    </div>
  );
};
```

## 9.4 **Key Learnings**

1. **Direct Import vs Registry**:
   - Initially tried using an icon registry with dynamic loading
   - Found that direct imports from `lucide-react` work better in the sandbox environment

2. **Sandbox Environment**:
   - All icons need to be available in the sandbox scope
   - Spreading `LucideIcons` into sandbox makes all icons available
   - The `require` function handles module imports in the sandbox

3. **Performance**:
   - All icons are technically available immediately
   - No need for complex lazy loading in the preview environment
   - The actual application can still use the icon registry for optimization

## 9.5 **Next Steps**

1. **ShadCN Integration**:
   - Implement similar sandbox environment for shadcn components
   - Test interaction between icons and shadcn components
   - Create test cases for complex component combinations

2. **Performance Optimization**:
   - Monitor bundle size impact
   - Consider code-splitting for production
   - Implement proper tree-shaking for unused icons

3. **Component Library**:
   - Create a standard set of icon + shadcn combinations
   - Document common patterns and best practices
   - Build reusable templates for the AI to reference
```

# 10. **Component Caching Strategy**

## 10.1 **Database Structure**
- Each component is stored individually in `cached_components`
- Metadata includes:
  - Dependencies
  - Whether it's a main/root component
  - Original name before renaming
  - Component type (functional, class, etc.)

## 10.2 **Caching Flow**
1. When a project version is saved:
   - Parse all components using `LivePreview.jsx`'s component detection
   - Store each component separately with its metadata
   - Maintain relationships between components via metadata

2. When editing:
   - Load cached components first
   - Allow AI to modify specific components without re-processing everything
   - Track component dependencies for smart updates

3. Benefits:
   - Faster loading of known components
   - Component-level version control
   - Easier component reuse across projects
   - More efficient AI editing (can focus on single component)

## 10.3 **Implementation in LivePreview**
The current `componentRegistry` in `LivePreview.jsx` already tracks:
- Original component names
- Component code
- Dependencies
- Main component flag

This maps perfectly to our caching schema and can be used to:
1. Save components to cache when complete
2. Load components from cache when editing
3. Track component relationships and dependencies
```

# 11. **Two-Step Design Proposal Flow**

> **IMPORTANT**: This section outlines our new core user flow that takes precedence over previous implementation details. The key innovation is splitting landing page generation into two distinct steps: (1) Design Proposal and (2) Code Generation. This approach significantly improves user confidence and result quality.

## 11.1 **Overview & Rationale**

### Why Two Steps?
1. **User Confidence**: By showing a design plan first, users can validate the AI's understanding before committing to code generation
2. **Quality Control**: The AI maintains consistency between the approved design plan and final code
3. **Memory/Context**: Design decisions are preserved and referenced during code generation
4. **User Experience**: Clear separation between planning and execution phases

### Flow Summary
1. **Step 1: Design Proposal**
   - User provides high-level requirements
   - AI generates a design plan (layout, style, structure)
   - User can refine or accept the plan
   
2. **Step 2: Code Generation**
   - Only begins after proposal acceptance
   - Uses approved design plan as context
   - Maintains existing SSE streaming for real-time preview

## 11.2 **Database Changes**

### New Table: Proposals
```sql
CREATE TABLE proposals (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  proposal TEXT NOT NULL,      -- Stores the actual design plan
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'accepted', 'rejected'
  metadata JSONB,             -- Store any additional context
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Optional: Store proposal revisions
CREATE TABLE proposal_revisions (
  id SERIAL PRIMARY KEY,
  proposal_id INT NOT NULL REFERENCES proposals(id),
  revision_number INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Optional: Store conversation context
CREATE TABLE conversation_messages (
  id SERIAL PRIMARY KEY,
  proposal_id INT NOT NULL REFERENCES proposals(id),
  role VARCHAR(10),           -- 'system', 'user', 'assistant'
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Sequelize Model
```javascript
// models/Proposal.js
const Proposal = sequelize.define('Proposal', {
  user_id: { 
    type: DataTypes.INTEGER, 
    allowNull: false 
  },
  proposal: { 
    type: DataTypes.TEXT, 
    allowNull: false 
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  }
});
```

## 11.3 **New API Endpoints**

### 1. Design Proposal Endpoints
```javascript
// routes/generate.js
router.post('/proposal', tokenCheckMiddleware, generateController.generateProposal);
router.put('/proposal/:id', tokenCheckMiddleware, generateController.refineProposal);
router.post('/proposal/:id/accept', tokenCheckMiddleware, generateController.acceptProposal);
```

### 2. Modified Code Generation
```javascript
// Now includes proposal context
router.post('/final', tokenCheckMiddleware, generateController.generateLandingPage);
```

## 11.4 **Controller Logic**

### Proposal Generation
```javascript
// controllers/generateController.js

exports.generateProposal = async (req, res) => {
  try {
    const user = req.user;
    const { audience, brandStyle, majorRequirements } = req.body;

    // Construct a design-focused prompt
    const prompt = `
      You are an expert web designer. Create a detailed design plan for a landing page.
      
      Audience: ${audience}
      Brand style: ${brandStyle}
      Requirements: ${majorRequirements}

      Provide a comprehensive design plan including:
      1. Layout structure
      2. Color scheme
      3. Typography recommendations
      4. Component hierarchy
      5. Key visual elements
      6. Responsive design considerations

      Return a clear, bullet-point plan. NO CODE, only design specifications.
    `;

    // Get design plan from AI
    const designPlan = await aiClient.generateProposal(prompt);

    // Store in database
    const proposal = await Proposal.create({
      user_id: user.id,
      proposal: designPlan,
      status: 'active'
    });

    return res.json({ 
      proposalId: proposal.id,
      designPlan 
    });
  } catch (err) {
    console.error('Proposal generation error:', err);
    return res.status(500).json({ error: 'Error generating proposal' });
  }
};
```

### Final Code Generation
```javascript
exports.generateLandingPage = async (req, res) => {
  try {
    const { proposalId } = req.body;
    const cacheManager = new ComponentCacheManager();

    // Set up SSE
    createSSEHeader(res);

    // Stream generation with caching
    let componentBuffer = '';
    await streamClaude(finalPrompt, async (chunk) => {
      componentBuffer += chunk;
      
      // Check if we have a complete component
      if (isCompleteComponent(componentBuffer)) {
        // Cache the component
        await cacheManager.cacheGeneratedComponents(proposalId, componentBuffer);
        
        // Clear buffer and send to client
        componentBuffer = '';
        res.write(`data: ${chunk}\n\n`);
      }
    });

    res.end();
  } catch (err) {
    console.error('Generation error:', err);
    res.end();
  }
};
```

## 11.5 **Front-End Implementation**

### Enhanced GeneratePage
```jsx
// pages/GeneratePage.jsx

const STEPS = {
  PROPOSAL: 'proposal',
  REVIEW_PROPOSAL: 'review_proposal',
  GENERATE: 'generate',
  PREVIEW: 'preview'
};

function GeneratePage() {
  const [currentStep, setCurrentStep] = useState(STEPS.PROPOSAL);
  const [designPlan, setDesignPlan] = useState(null);
  const [proposalId, setProposalId] = useState(null);
  
  // Form state for proposal
  const [formData, setFormData] = useState({
    audience: '',
    brandStyle: '',
    majorRequirements: ''
  });

  // Generation state
  const [generatedCode, setGeneratedCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // ... rest of the implementation
}
```

## 11.6 **AI Client Modifications**

```javascript
// utils/aiClient.js

// New method for proposal generation
exports.generateProposal = async function(prompt) {
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.anthropic.com/v1/messages',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      data: {
        model: 'claude-3-haiku-20240307',
        messages: [{
          role: 'user',
          content: [{
            type: 'text',
            text: prompt
          }]
        }],
        max_tokens: 1000,  // Shorter for proposals
        temperature: 0.7
      }
    });

    return response.data.content;
  } catch (error) {
    console.error('Proposal generation error:', error);
    throw error;
  }
};

// Existing streamClaude modified to include proposal context
exports.streamClaude = async function(prompt, onChunk) {
  // ... existing streaming logic ...
};
```

## 11.7 **Key Benefits & Considerations**

1. **Improved User Experience**
   - Clear separation between design and implementation
   - Opportunity to refine design before code generation
   - Better alignment with traditional web design workflows

2. **Technical Advantages**
   - Proposal storage provides version control for design decisions
   - AI maintains context between steps
   - Smaller, focused API calls for proposals

3. **Business Benefits**
   - Higher user satisfaction through involvement in design process
   - Reduced iterations on final code
   - Clear audit trail of design decisions

4. **Implementation Notes**
   - Consider implementing proposal templates for common use cases
   - Add analytics to track proposal acceptance rates
   - Monitor token usage separately for proposals vs. code generation

## 11.8 **Migration Plan**

1. **Phase 1: Database Setup**
   - Add proposals table
   - Create necessary indexes
   - Set up backup procedures

2. **Phase 2: API Implementation**
   - Add proposal endpoints
   - Modify existing generation endpoint
   - Update API documentation

3. **Phase 3: Front-End Updates**
   - Implement new UI flow
   - Add proposal review interface
   - Update generation preview

4. **Phase 4: Testing**
   - Verify proposal storage
   - Test refinement flow
   - Validate context preservation

This two-step approach represents a significant improvement in our generation pipeline, providing users with more control and confidence in the final output while maintaining the technical advantages of our existing SSE-based generation system.

## 11.9 **Proposal-to-Cache Integration**

### Component Persistence Strategy

1. **Proposal Acceptance Flow**
```javascript
// controllers/generateController.js
exports.acceptProposal = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const proposal = await Proposal.findByPk(proposalId);
    
    // Update proposal status
    proposal.status = 'accepted';
    await proposal.save();

    // Create initial cached entry to track the proposal's components
    await CachedComponents.create({
      user_id: req.user.id,
      proposal_id: proposalId,
      status: 'pending_generation',
      metadata: {
        designPlan: proposal.proposal,
        componentHierarchy: [], // Will be populated during generation
        styleGuide: {} // Extracted from proposal
      }
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('Error accepting proposal:', err);
    return res.status(500).json({ error: 'Failed to accept proposal' });
  }
};
```

2. **Component Generation & Caching**
```javascript
// utils/componentCache.js
class ComponentCacheManager {
  async cacheGeneratedComponents(proposalId, components) {
    const cached = await CachedComponents.findOne({
      where: { proposal_id: proposalId }
    });

    // Parse components using LivePreview's detection
    const parsedComponents = await this.parseComponents(components);
    
    // Store each component with its metadata
    for (const component of parsedComponents) {
      await CachedComponent.create({
        cache_id: cached.id,
        name: component.name,
        code: component.code,
        dependencies: component.dependencies,
        isMain: component.isMain,
        metadata: {
          originalName: component.name,
          type: 'functional', // or 'class'
          proposal_context: cached.metadata.designPlan
        }
      });
    }

    // Update cache status
    cached.status = 'complete';
    cached.metadata.componentHierarchy = this.buildHierarchy(parsedComponents);
    await cached.save();
  }

  async loadCachedComponents(userId) {
    return await CachedComponent.findAll({
      include: [{
        model: CachedComponents,
        where: { user_id: userId }
      }],
      order: [['created_at', 'DESC']]
    });
  }
}
```

3. **Integration with Generation Pipeline**
```javascript
// controllers/generateController.js
exports.generateLandingPage = async (req, res) => {
  try {
    const { proposalId } = req.body;
    const cacheManager = new ComponentCacheManager();

    // Set up SSE
    createSSEHeader(res);

    // Stream generation with caching
    let componentBuffer = '';
    await streamClaude(finalPrompt, async (chunk) => {
      componentBuffer += chunk;
      
      // Check if we have a complete component
      if (isCompleteComponent(componentBuffer)) {
        // Cache the component
        await cacheManager.cacheGeneratedComponents(proposalId, componentBuffer);
        
        // Clear buffer and send to client
        componentBuffer = '';
        res.write(`data: ${chunk}\n\n`);
      }
    });

    res.end();
  } catch (err) {
    console.error('Generation error:', err);
    res.end();
  }
};
```

### Database Schema Updates

```sql
-- Add relationship between cached_components and proposals
ALTER TABLE cached_components
ADD COLUMN proposal_id INT REFERENCES proposals(id);

-- Add index for faster lookups
CREATE INDEX idx_cached_components_proposal ON cached_components(proposal_id);
```

### Cache Retrieval in LivePreview

```javascript
// components/LivePreview.jsx
const LivePreview = ({ proposalId, components = [] }) => {
  const [cachedComponents, setCachedComponents] = useState([]);
  
  useEffect(() => {
    // Load cached components when available
    const loadCache = async () => {
      const cacheManager = new ComponentCacheManager();
      const cached = await cacheManager.loadCachedComponents(proposalId);
      setCachedComponents(cached);
    };
    
    if (proposalId) {
      loadCache();
    }
  }, [proposalId]);

  // Merge cached components with new ones
  const allComponents = useMemo(() => {
    return mergeComponents(cachedComponents, components);
  }, [cachedComponents, components]);

  return (
    <div className="w-full bg-[#0B1121] rounded-lg overflow-hidden">
      {allComponents.map((component) => (
        <ComponentRenderer
          key={component.id}
          component={component}
          cached={component.isCached}
        />
      ))}
    </div>
  );
};
```

### Key Benefits of Integration

1. **Seamless Persistence**
   - Components are cached as they're generated
   - Each component maintains its link to the original proposal
   - Users can return to their work at any time

2. **Performance Optimization**
   - Cached components load instantly
   - Reduces need for re-generation
   - Maintains component relationships

3. **Version Control**
   - Each proposal can have multiple component versions
   - Changes are tracked and can be reverted
   - Component history is preserved

4. **Smart Component Reuse**
   - Similar proposals can share component cache
   - Faster generation for common patterns
   - Reduced API calls and token usage

### Implementation Considerations

1. **Cache Invalidation**
   - Set up periodic cleanup of unused components
   - Implement versioning for cache updates
   - Handle conflicts between cached and new components

2. **Memory Management**
   - Implement LRU cache for frequently used components
   - Set up batch processing for large component sets
   - Monitor cache size and performance

3. **Security**
   - Ensure components are only accessible to their owners
   - Implement proper access control in cache manager
   - Sanitize cached code before execution

This integration ensures that our two-step design flow maintains state and provides a seamless experience for users returning to their projects. The caching system preserves the connection between proposals and their generated components while optimizing performance and enabling component reuse.
```

# 12. **Implementation Notes & Best Practices**

## 12.1 **Database Strategy**

### Database Unification
We will use **PostgreSQL** as our primary database for all data storage needs:

1. **Why PostgreSQL Only**:
   - JSONB support for flexible component storage
   - Strong transactional guarantees for proposal-to-component flow
   - Built-in full-text search for component queries
   - Excellent handling of relational data (users, projects, proposals)

2. **Removing MongoDB**:
   - Simplifies deployment and maintenance
   - Reduces operational complexity
   - Ensures ACID compliance across all operations
   - Better integration with our caching layer

### Schema Optimization
```sql
-- Optimized table structure for component caching
CREATE TABLE cached_components (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id),
  proposal_id INT NOT NULL REFERENCES proposals(id),
  name VARCHAR(255) NOT NULL,
  code TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  dependencies JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Optimizations
  CONSTRAINT valid_metadata CHECK (jsonb_typeof(metadata) = 'object'),
  CONSTRAINT valid_dependencies CHECK (jsonb_typeof(dependencies) = 'array')
);

-- Indexes for common queries
CREATE INDEX idx_component_user_proposal ON cached_components(user_id, proposal_id);
CREATE INDEX idx_component_dependencies ON cached_components USING gin(dependencies);
```

## 12.2 **SSE Implementation Best Practices**

### Robust Chunk Handling
```javascript
// utils/sseHelpers.js
class SSEStreamManager {
  constructor() {
    this.buffer = '';
    this.lastMessageTime = Date.now();
    this.timeoutMs = 30000; // 30 seconds
  }

  handleChunk(chunk, onComplete) {
    this.buffer += chunk;
    this.lastMessageTime = Date.now();

    // Process complete messages
    const messages = this.buffer.split('\n\n');
    this.buffer = messages.pop() || '';

    messages.forEach(message => {
      if (message.trim() === '') return;
      
      try {
        const data = this.parseSSEMessage(message);
        if (data) onComplete(data);
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    });
  }

  parseSSEMessage(message) {
    const lines = message.split('\n');
    const data = {};

    lines.forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        const [, field, value] = match;
        data[field] = value;
      }
    });

    return data.data ? JSON.parse(data.data) : null;
  }

  isStale() {
    return Date.now() - this.lastMessageTime > this.timeoutMs;
  }
}
```

### Client-Side Implementation
```javascript
// services/sseService.js
class SSEClient {
  constructor(url, options = {}) {
    this.url = url;
    this.options = {
      timeout: options.timeout || 30000,
      retryLimit: options.retryLimit || 3,
      retryDelay: options.retryDelay || 1000
    };
  }

  async connect(onMessage, onError) {
    let retryCount = 0;
    
    while (retryCount < this.options.retryLimit) {
      try {
        const response = await fetch(this.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': localStorage.getItem('userId')
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const streamManager = new SSEStreamManager();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          streamManager.handleChunk(chunk, onMessage);

          if (streamManager.isStale()) {
            throw new Error('SSE connection timed out');
          }
        }

        break; // Success, exit retry loop
      } catch (error) {
        retryCount++;
        if (retryCount === this.options.retryLimit) {
          onError(error);
          break;
        }
        await new Promise(resolve => setTimeout(resolve, this.options.retryDelay));
      }
    }
  }
}
```

## 12.3 **Front-End Performance Optimization**

### Babel Configuration
```javascript
// babel.config.js
module.exports = {
  presets: [
    ['@babel/preset-env', {
      modules: false,
      useBuiltIns: 'usage',
      corejs: 3,
      targets: {
        browsers: ['last 2 versions', 'not dead', '> 0.2%']
      }
    }],
    '@babel/preset-react'
  ],
  plugins: [
    // Only include necessary transforms
    '@babel/plugin-transform-runtime',
    ['@babel/plugin-proposal-class-properties', { loose: true }]
  ],
  env: {
    production: {
      // Production-specific optimizations
      plugins: [
        ['transform-react-remove-prop-types', { removeImport: true }]
      ]
    }
  }
};
```

### Component Evaluation Strategy
```javascript
// utils/componentEvaluator.js
class ComponentEvaluator {
  constructor() {
    this.cache = new Map();
    this.pendingEvaluations = new Map();
  }

  async evaluateComponent(component, dependencies = []) {
    const cacheKey = this.getCacheKey(component, dependencies);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Prevent duplicate evaluations
    if (this.pendingEvaluations.has(cacheKey)) {
      return this.pendingEvaluations.get(cacheKey);
    }

    // Evaluate component
    const evaluationPromise = this._doEvaluation(component, dependencies);
    this.pendingEvaluations.set(cacheKey, evaluationPromise);

    try {
      const result = await evaluationPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingEvaluations.delete(cacheKey);
    }
  }

  private async _doEvaluation(component, dependencies) {
    // Implement actual evaluation logic
    // Consider using web workers for heavy transformations
  }
}
```

## 12.4 **Security & Deployment Considerations**

### Environment-Specific Configuration
```javascript
// config/environment.js
const config = {
  development: {
    sseTimeout: 30000,
    maxComponentSize: 1000000, // 1MB
    cacheTimeout: 3600000, // 1 hour
    proxyTimeout: 120000 // 2 minutes
  },
  production: {
    sseTimeout: 60000,
    maxComponentSize: 500000, // 500KB
    cacheTimeout: 7200000, // 2 hours
    proxyTimeout: 180000 // 3 minutes
  }
};

module.exports = config[process.env.NODE_ENV || 'development'];
```

### Security Headers
```javascript
// middleware/security.js
const helmet = require('helmet');

const securityMiddleware = [
  helmet(),
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-eval'"], // Required for component evaluation
      styleSrc: ["'self'", "'unsafe-inline'"], // Required for styled-components
      connectSrc: ["'self'", process.env.API_URL],
      upgradeInsecureRequests: []
    }
  }),
  // Rate limiting, CORS, etc.
];

module.exports = securityMiddleware;
```

## 12.5 **Monitoring & Error Handling**

### Component Generation Monitoring
```javascript
// services/monitoring.js
class GenerationMonitor {
  constructor() {
    this.metrics = {
      totalGenerations: 0,
      successfulGenerations: 0,
      failedGenerations: 0,
      averageGenerationTime: 0,
      cacheHitRate: 0
    };
  }

  trackGeneration(startTime, success) {
    this.metrics.totalGenerations++;
    if (success) {
      this.metrics.successfulGenerations++;
      this.updateAverageTime(Date.now() - startTime);
    } else {
      this.metrics.failedGenerations++;
    }
  }

  trackCacheHit(hit) {
    // Update cache hit rate
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.successfulGenerations / this.metrics.totalGenerations,
      failureRate: this.metrics.failedGenerations / this.metrics.totalGenerations
    };
  }
}
```

These implementation notes address the key points raised in the feedback while maintaining our core architecture. The focus is on:
1. Simplified database strategy using PostgreSQL
2. Robust SSE implementation with proper error handling
3. Optimized front-end performance
4. Production-ready security and deployment considerations
5. Comprehensive monitoring and metrics

This provides a solid foundation for building a reliable and scalable application.

# 13. **Testing Strategy**

> **IMPORTANT**: This section outlines our testing approach across all layers of the application. Early test planning helps identify potential issues before they become costly to fix and ensures reliable functionality as the codebase grows.

## 13.1 **Database & Models Testing**

### Unit Tests for Models
```javascript
// tests/models/proposal.test.js
describe('Proposal Model', () => {
  beforeEach(async () => {
    await sequelize.sync({ force: true }); // Reset DB
  });

  test('creates proposal with valid data', async () => {
    const proposal = await Proposal.create({
      user_id: 1,
      proposal: 'Test design plan',
      status: 'active'
    });
    expect(proposal.id).toBeDefined();
    expect(proposal.status).toBe('active');
  });

  test('enforces JSON constraints', async () => {
    await expect(CachedComponent.create({
      metadata: 'invalid-json', // Should be object
      dependencies: 'invalid-json' // Should be array
    })).rejects.toThrow();
  });
});
```

### Integration Tests for Database
```javascript
// tests/integration/database.test.js
describe('Database Connection', () => {
  test('connects to test database', async () => {
    await expect(sequelize.authenticate()).resolves.not.toThrow();
  });

  test('runs migrations successfully', async () => {
    const [results] = await sequelize.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public'"
    );
    expect(results).toContainEqual({ table_name: 'proposals' });
    expect(results).toContainEqual({ table_name: 'cached_components' });
  });
});
```

## 13.2 **Authentication & Beta Flow Testing**

### Middleware Tests
```javascript
// tests/middleware/auth.test.js
describe('Token Check Middleware', () => {
  test('rejects requests without user ID', async () => {
    const req = mockRequest({});
    const res = mockResponse();
    
    await tokenCheckMiddleware(req, res, nextFunction);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects pending users', async () => {
    const req = mockRequest({
      headers: { 'x-user-id': pendingUserId }
    });
    const res = mockResponse();
    
    await tokenCheckMiddleware(req, res, nextFunction);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

### Token Management Tests
```javascript
// tests/services/token.test.js
describe('Token Management', () => {
  test('decrements tokens on generation', async () => {
    const user = await createTestUser({ tokens_remaining: 100 });
    await generateProposal(user.id); // Should cost 50 tokens
    
    const updatedUser = await User.findByPk(user.id);
    expect(updatedUser.tokens_remaining).toBe(50);
  });

  test('prevents generation without sufficient tokens', async () => {
    const user = await createTestUser({ tokens_remaining: 10 });
    await expect(generateProposal(user.id)).rejects.toThrow('Not enough tokens');
  });
});
```

## 13.3 **SSE Implementation Testing**

### Stream Management Tests
```javascript
// tests/utils/sse.test.js
describe('SSE Stream Manager', () => {
  let streamManager;

  beforeEach(() => {
    streamManager = new SSEStreamManager();
  });

  test('handles partial chunks correctly', () => {
    const chunks = [
      'data: {"type":"start"',
      '}\n\ndata: {"type":"content"}\n\n'
    ];
    
    const messages = [];
    chunks.forEach(chunk => {
      streamManager.handleChunk(chunk, (msg) => messages.push(msg));
    });
    
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ type: 'start' });
  });

  test('detects stale connections', () => {
    jest.useFakeTimers();
    streamManager.lastMessageTime = Date.now() - 31000; // 31 seconds ago
    expect(streamManager.isStale()).toBe(true);
  });
});
```

### Client Implementation Tests
```javascript
// tests/services/sseClient.test.js
describe('SSE Client', () => {
  test('retries on connection failure', async () => {
    const client = new SSEClient('http://test-url', {
      retryLimit: 2,
      retryDelay: 100
    });
    
    // Mock fetch to fail once then succeed
    global.fetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockStreamResponse());
    
    await client.connect();
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test('handles timeout gracefully', async () => {
    const client = new SSEClient('http://test-url', {
      timeout: 1000
    });
    
    const onError = jest.fn();
    await client.connect(null, onError);
    
    jest.advanceTimersByTime(1100);
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });
});
```

## 13.4 **AI Integration Testing**

### Proposal Generation Tests
```javascript
// tests/services/ai.test.js
describe('AI Client', () => {
  test('generates valid proposal', async () => {
    const prompt = {
      audience: 'developers',
      brandStyle: 'modern',
      majorRequirements: 'landing page'
    };
    
    const proposal = await generateProposal(prompt);
    expect(proposal).toHaveProperty('designPlan');
    expect(proposal.designPlan).toContain('Layout structure');
  });

  test('handles AI service errors', async () => {
    // Mock AI service to throw error
    mockAnthropicAPI.mockRejectedValue(new Error('Service unavailable'));
    
    await expect(generateProposal({}))
      .rejects
      .toThrow('AI service error');
  });
});
```

### Component Generation Tests
```javascript
// tests/services/generation.test.js
describe('Component Generation', () => {
  test('generates components from accepted proposal', async () => {
    const proposal = await createTestProposal({ status: 'accepted' });
    const stream = await generateComponents(proposal.id);
    
    const components = await collectStreamComponents(stream);
    expect(components).toContainEqual(
      expect.objectContaining({
        name: 'HeroSection',
        isComplete: true
      })
    );
  });

  test('maintains proposal context in generation', async () => {
    const proposal = await createTestProposal({
      proposal: 'Use blue color scheme'
    });
    
    const components = await generateAndCollectComponents(proposal.id);
    const heroComponent = components.find(c => c.name === 'HeroSection');
    
    expect(heroComponent.code).toContain('text-blue');
  });
});
```

## 13.5 **Component Caching Tests**

### Cache Operations
```javascript
// tests/services/cache.test.js
describe('Component Cache', () => {
  test('caches generated components', async () => {
    const cacheManager = new ComponentCacheManager();
    const component = createTestComponent();
    
    await cacheManager.cacheGeneratedComponents(proposalId, [component]);
    
    const cached = await CachedComponent.findOne({
      where: { name: component.name }
    });
    expect(cached).toBeDefined();
    expect(cached.code).toBe(component.code);
  });

  test('loads cached components by user', async () => {
    const components = await cacheManager.loadCachedComponents(userId);
    expect(components).toBeInstanceOf(Array);
    expect(components[0]).toHaveProperty('metadata');
  });
});
```

### Dependency Management
```javascript
// tests/utils/dependencies.test.js
describe('Component Dependencies', () => {
  test('extracts dependencies from JSX', () => {
    const code = `
      function HeroSection() {
        return <div><Navbar/><Button/></div>
      }
    `;
    
    const deps = extractDependencies(code);
    expect(deps).toContain('Navbar');
    expect(deps).toContain('Button');
  });

  test('builds correct dependency hierarchy', () => {
    const components = [
      { name: 'HeroSection', dependencies: ['Navbar'] },
      { name: 'Navbar', dependencies: ['Button'] }
    ];
    
    const hierarchy = buildHierarchy(components);
    expect(hierarchy.HeroSection.children).toContain('Navbar');
    expect(hierarchy.Navbar.children).toContain('Button');
  });
});
```

## 13.6 **Front-End Integration Tests**

### Generate Page Flow
```javascript
// tests/e2e/generate.test.js
describe('Generate Page', () => {
  test('complete generation flow', async () => {
    // Setup test user
    const user = await createTestUser({ status: 'approved' });
    
    // Visit generate page
    await page.goto('/generate');
    await page.fill('[name="prompt"]', 'Create a landing page');
    await page.click('button[type="submit"]');
    
    // Wait for proposal
    await page.waitForSelector('.proposal-preview');
    await page.click('button:text("Accept")');
    
    // Wait for component generation
    await page.waitForSelector('.live-preview');
    
    // Verify components rendered
    expect(await page.$$('.component-preview')).toHaveLength(3);
  });
});
```

### LivePreview Component
```javascript
// tests/components/LivePreview.test.jsx
describe('LivePreview', () => {
  test('renders cached components', async () => {
    const cached = [createTestComponent({ name: 'TestComponent' })];
    const { container } = render(
      <LivePreview proposalId={1} cachedComponents={cached} />
    );
    
    expect(container).toHaveTextContent('TestComponent');
  });

  test('handles evaluation errors gracefully', () => {
    const component = createTestComponent({
      code: 'invalid javascript'
    });
    
    const { container } = render(
      <LivePreview components={[component]} />
    );
    
    expect(container).toHaveTextContent('Failed to render component');
  });
});
```

## 13.7 **Performance & Security Tests**

### Load Testing
```javascript
// tests/performance/load.test.js
describe('Load Tests', () => {
  test('handles multiple SSE connections', async () => {
    const connections = Array(50).fill(0).map(() => 
      new SSEClient('/api/generate').connect()
    );
    
    await Promise.all(connections);
    // Check server metrics, memory usage
  });

  test('caches improve component load time', async () => {
    const start = Date.now();
    await loadCachedComponents(userId);
    const cachedTime = Date.now() - start;
    
    const freshStart = Date.now();
    await generateNewComponents(userId);
    const freshTime = Date.now() - freshStart;
    
    expect(cachedTime).toBeLessThan(freshTime / 2);
  });
});
```

### Security Tests
```javascript
// tests/security/injection.test.js
describe('Security Checks', () => {
  test('prevents XSS in component code', async () => {
    const maliciousCode = `
      function Component() {
        return <div dangerouslySetInnerHTML={{
          __html: '<script>alert("xss")</script>'
        }} />
      }
    `;
    
    const { container } = render(
      <LivePreview components={[{ code: maliciousCode }]} />
    );
    
    expect(container.innerHTML).not.toContain('<script>');
  });

  test('validates proposal input', async () => {
    const maliciousPrompt = {
      audience: 'test\'; DROP TABLE users; --'
    };
    
    await expect(generateProposal(maliciousPrompt))
      .rejects
      .toThrow('Invalid input');
  });
});
```

## 13.8 **Test Implementation Plan**

1. **Phase 1: Core Infrastructure**
   - Database connection and model tests
   - Basic auth flow tests
   - SSE implementation tests

2. **Phase 2: Generation Pipeline**
   - Proposal generation tests
   - Component generation tests
   - Caching system tests

3. **Phase 3: Front-End Integration**
   - Component rendering tests
   - User flow tests
   - Error handling tests

4. **Phase 4: Performance & Security**
   - Load tests
   - Security vulnerability tests
   - End-to-end flow tests

### Test Environment Setup
```javascript
// jest.config.js
module.exports = {
  projects: [
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/tests/**/*.test.js'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/database.js']
    },
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/tests/**/*.test.jsx'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/dom.js']
    }
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx}',
    '!src/index.js',
    '!src/setupTests.js'
  ]
};
```

This comprehensive testing strategy ensures:
1. Early detection of issues
2. Reliable functionality across all layers
3. Confidence in deployment
4. Clear path for future enhancements

The tests will grow alongside the application, providing a safety net for refactoring and new feature development.