## 1. **Proposed File Structure**

```
shapeweb/
├─ backend/
│  ├─ controllers/
│  │  ├─ authController.js
│  │  ├─ generateController.js
│  │  ├─ editController.js
│  │  └─ projectsController.js
│  ├─ models/
│  │  ├─ User.js
│  │  ├─ Project.js
│  │  └─ ProjectVersion.js
│  ├─ routes/
│  │  ├─ auth.js
│  │  ├─ generate.js
│  │  ├─ edit.js
│  │  └─ projects.js
│  ├─ utils/
│  │  ├─ aiClient.js    (handles Claude API calls)
│  │  ├─ tokenCheck.js  (middleware for token verification)
│  │  └─ sseHelpers.js  (helper functions for SSE)
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
│  │  │  ├─ GeneratePage.jsx
│  │  │  ├─ ProjectEditorPage.jsx
│  │  │  └─ ...
│  │  ├─ components/
│  │  │  ├─ NavBar.jsx
│  │  │  ├─ ProjectCard.jsx
│  │  │  ├─ LivePreview.jsx
│  │  │  ├─ ComponentHighlighter.jsx
│  │  │  └─ ...
│  │  ├─ context/
│  │  │  └─ AuthContext.jsx
│  │  └─ services/
│  │     └─ apiService.js
│  ├─ public/
│  ├─ package.json
│  └─ ...
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
Here’s a **pseudo-SQL** schema:

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

    // streamClaude is a function that calls Claude’s streaming API
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

---

# 3. **Front-End Details**

## 3.1 **High-Level Workflow**

1. **Beta Sign-Up Page**:  
   - Minimal form → calls `POST /api/auth/beta-signup`.  
2. **Dashboard Page**:  
   - After user is approved and logged in, calls `GET /api/projects` to fetch their projects.  
   - “Create New Landing Page” → navigates to Generate Page.  
3. **Generate Page**:  
   - Text field for prompt → on submission, calls `POST /api/generate`.  
   - Listens to SSE. As chunks arrive, build up the code in state and visually render.  
   - “Accept” → calls `POST /api/projects` with final code.  
4. **Project Editor Page**:  
   - Shows the last accepted version.  
   - Hover + highlight components → user opens “chat bubble” → sends code snippet + user instruction to `POST /api/edit` SSE.  
   - Receive updated code → re-render.  
   - “Save Changes” → `POST /api/projects/:projectId/versions`.

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
   - If user clicks “Save Changes,” you do a `POST /api/projects/:projectId/versions`.  
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
  1. Send entire code + a “design review” prompt to Claude.  
  2. Return suggestions or updated code.  
  3. User chooses to apply or discard.  

> For an MVP, keep it minimal. Maybe just show textual suggestions before applying changes.

---

# 7. **Export to GitHub**

- **Future**: Set up OAuth with GitHub, store user’s OAuth tokens, and create a new repo or gist via [GitHub REST API](https://docs.github.com/en/rest).  
- **MVP**: A “Download Code” button that compiles the code into a `.zip`.

---

# 8. **Putting It All Together**

**User Workflow**:  
1. **Sign Up** for Beta → Wait for Approval → Admin updates status in DB.  
2. **Login** (or pass `x-user-id` in headers for testing).  
3. **Dashboard**: Sees list of projects.  
4. **Generate** a new landing page → SSE → watch code appear in a live preview → Accept → project created.  
5. **Edit** the page → hover + highlight snippet → instruct AI → SSE → updated code → user clicks “Save” → new version stored.  
6. **Design Agent**: Optionally ask for a review.  

You now have a **front-end** that is streaming partial code from **Claude** via SSE, and a **back-end** that manages **tokens**, **projects**, and **versions** in **Postgres**. Lazy-load your icons, incorporate **ShadCN** UI components where needed for a polished design, and store images (if needed) in an **S3 bucket**.

**Performance Considerations**: For an alpha, you can run everything on a small server. Optimize only if you notice big lag or scaling issues.

---

## **Next Steps**

1. **Implement the Database** (Prisma / Sequelize / raw SQL).  
2. **Set Up the SSE** endpoints carefully. Test chunk-by-chunk streaming from Claude’s real API.  
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