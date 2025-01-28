## Visual Plan

Below is a **comprehensive roadmap** that illustrates how each file and directory connects within your **ShapeWeb** application. The **Mermaid** diagram demonstrates the major flows between **frontend** and **backend**, along with key file-to-file relationships. Following the diagram, you’ll find a **detailed explanation** of each file’s purpose and how it fits into the overall system.

```mermaid
flowchart TB
  %% ----------------- BACKEND SUBGRAPH ----------------- %%
  subgraph Backend [Node.js / Express Application]
    direction TB

    A1(server.js)
    A2(app.js)
    
    %% Routes
    subgraph Routes
      direction TB
      R1(auth.js)
      R2(generate.js)
      R3(edit.js)
      R4(projects.js)
      R5(proposals.js)
    end
    
    %% Controllers
    subgraph Controllers
      direction TB
      C1(authController.js)
      C2(generateController.js)
      C3(editController.js)
      C4(projectsController.js)
      C5(proposalController.js)
    end
    
    %% Models
    subgraph Models
      direction TB
      M1(User.js)
      M2(Project.js)
      M3(ProjectVersion.js)
      M4(Proposal.js)
      M5(ProposalRevision.js)
      M6(CachedComponent.js)
      M7(ConversationMessage.js)
    end
    
    %% Services
    subgraph Services
      direction TB
      S1(ProposalService.js)
      S2(CacheService.js)
      S3(GenerationService.js)
    end
    
    %% Utils
    subgraph Utils
      direction TB
      U1(aiClient.js)
      U2(componentCache.js)
      U3(proposalParser.js)
      U4(componentParser.js)
      U5(tokenCheck.js)
      U6(sseHelpers.js)
    end
    
    A1 --> A2
    A2 --> Routes
    R1 --> C1
    R2 --> C2
    R3 --> C3
    R4 --> C4
    R5 --> C5
    
    C1 --> M1
    C2 --> U1
    C2 --> U6
    C3 --> U1
    C3 --> U6
    C4 --> M2
    C4 --> M3
    C5 --> M4
    C5 --> M5
    C5 --> M6
    
    U1 -->|"Stream SSE\nClaude API"|C2
    U1 -->|"Stream SSE\nClaude API"|C3
    
    S1 --> M4
    S1 --> M5
    S2 --> M6
    S3 --> U1
    
    U2 -->|"Cache logic"|M6
    U5 --> M1
    
    A2 -->|"Express Middleware\n(tokenCheck, etc.)"|U5
    A2 --> M1
    A2 --> M2
    A2 --> M3
    A2 --> M4
    A2 --> M5
    A2 --> M6
    A2 --> M7
  end

  %% ----------------- FRONTEND SUBGRAPH ----------------- %%
  subgraph Frontend [React Application]
    direction TB
    
    F1(index.js)
    F2(App.js)
    
    %% Pages
    subgraph Pages
      direction TB
      P1(HomePage.jsx)
      P2(BetaSignUpPage.jsx)
      P3(DashboardPage.jsx)
      P4(ProposalPage.jsx)
      P5(GeneratePage.jsx)
      P6(ProjectEditorPage.jsx)
    end
    
    %% Components
    subgraph Components
      direction TB
      SC1(proposal/\nProposalForm.jsx)
      SC2(proposal/\nProposalPreview.jsx)
      SC3(proposal/\nProposalRevisions.jsx)
      SC4(cache/\nCacheManager.jsx)
      SC5(cache/\nCachedComponentList.jsx)
      SC6(NavBar.jsx)
      SC7(ProjectCard.jsx)
      SC8(LivePreview.jsx)
      SC9(ComponentHighlighter.jsx)
    end
    
    %% Context
    subgraph Context
      direction TB
      CT1(AuthContext.jsx)
      CT2(ProposalContext.jsx)
      CT3(CacheContext.jsx)
    end
    
    %% Hooks
    subgraph Hooks
      direction TB
      H1(useProposal.js)
      H2(useCache.js)
      H3(useComponentGeneration.js)
    end
    
    %% Services
    subgraph FE Services
      direction TB
      FS1(apiService.js)
      FS2(proposalService.js)
      FS3(cacheService.js)
    end
    
    F1 --> F2
    F2 --> Pages
    P1 --> F2
    P2 --> F2
    P3 --> F2
    P4 --> F2
    P5 --> F2
    P6 --> F2
    
    F2 --> Components
    F2 --> Context
    F2 --> Hooks
    F2 --> FE Services
    
    FS1 -->|"SSE/HTTP\nCalls to backend"|Routes
    FS2 -->|"Proposal mgmt"|C5
    FS3 -->|"Cache mgmt"|C2
    
    Components --> FS1
    Components --> FS2
    Components --> FS3
    
    H1 --> FS2
    H2 --> FS3
    H3 --> FS1
    
    CT1 --> P2
    CT2 --> P4
    CT3 --> P6
  end

  %% ----------------- FLOW ARROWS ----------------- %%
  Frontend -- User's browser calls REST/SSE --> Backend
  Backend -- Stores & Retrieves --> Models
  Backend -- (SSE/HTTP) --> Frontend
```

---

### Roadmap Explanation

Below is a **file-by-file** summary explaining its function, **why** it exists, and **how** it connects to the larger system.

---

#### **Backend**

1. **`server.js`**  
   - **Purpose**: The main entry point that starts the Express server on a specified port.  
   - **Connections**:  
     - Imports `app.js` to configure routes and middleware.  
     - Boots up database connections (via `database.js` or `sequelize.sync()`).  

2. **`app.js`**  
   - **Purpose**: Configures Express, global middleware (like `cors`, `body-parser`), and mounts all **route** files.  
   - **Connections**:  
     - Imports route modules (`auth.js`, `generate.js`, `edit.js`, `projects.js`, etc.) and attaches them to endpoints under `/api/...`.  
     - Runs any global middleware (CORS, JSON parsing, etc.).  

3. **Routes**  
   - **`auth.js`**  
     - **Purpose**: Defines endpoints for beta sign-up, user approval, login, etc.  
     - **Calls**: `authController.js` to handle business logic.  
   - **`generate.js`**  
     - **Purpose**: Houses endpoints related to generating code via SSE.  
     - **Calls**: `generateController.js` for SSE and AI interactions.  
   - **`edit.js`**  
     - **Purpose**: Defines endpoints to edit existing code (SSE-based AI edits).  
     - **Calls**: `editController.js`.  
   - **`projects.js`**  
     - **Purpose**: CRUD endpoints for Projects and Versions.  
     - **Calls**: `projectsController.js`.  
   - **`proposals.js`**  
     - **Purpose**: (Optional in your structure) Manages the “design proposal” flow.  
     - **Calls**: `proposalController.js`.  

4. **Controllers**  
   - **`authController.js`**  
     - **Purpose**: Beta sign-up logic, user creation, admin approval.  
     - **Uses**: `User` model for user data.  
   - **`generateController.js`**  
     - **Purpose**: Main SSE-based generation logic, constructs prompts, calls AI client, decrements tokens.  
     - **Uses**:  
       - `aiClient.js` to stream from Claude.  
       - `sseHelpers.js` to set SSE headers.  
       - `tokenCheck.js` for token decrement.  
   - **`editController.js`**  
     - **Purpose**: Similar SSE approach but for modifying a snippet rather than generating from scratch.  
     - **Uses**:  
       - `aiClient.js` for streaming.  
       - `sseHelpers.js` for SSE.  
       - `tokenCheck.js`.  
   - **`projectsController.js`**  
     - **Purpose**: Creating projects, storing code versions, fetching user’s projects, saving new versions.  
     - **Uses**: `Project`, `ProjectVersion` models.  
   - **`proposalController.js`**  
     - **Purpose**: (If you’re implementing the two-step “Design Proposal” flow) handles creation, refinement, acceptance of design proposals.  
     - **Uses**: `Proposal`, `ProposalRevision` models; possibly `aiClient.js` if generating the proposal text.  

5. **Models**  
   - **`User.js`**  
     - **Purpose**: Represents a system user (beta sign-up, approval status, tokens).  
     - **Relations**: Linked to `projects`, `proposals` by `user_id`.  
   - **`Project.js`, `ProjectVersion.js`**  
     - **Purpose**: Store project data and track its versions.  
     - **Relations**: Many `ProjectVersion`s can belong to one `Project`.  
   - **`Proposal.js`, `ProposalRevision.js`**  
     - **Purpose**: If using the “two-step proposal” approach, these hold the design plan, any revisions, and link to the user.  
   - **`CachedComponent.js`**  
     - **Purpose**: Holds individual code components generated by AI, along with `metadata` (e.g., dependencies, type).  
   - **`ConversationMessage.js`**  
     - **Purpose**: If you need to log AI-human messages (chat history, system messages, etc.).  

6. **Services**  
   - **`ProposalService.js`**  
     - **Purpose**: Encapsulates logic around creating or updating proposals, ensuring you have a clean interface to the DB.  
   - **`CacheService.js`**  
     - **Purpose**: Manages caching logic—where to store generated components, how to retrieve them, invalidation.  
   - **`GenerationService.js`**  
     - **Purpose**: Could centralize advanced logic for generating or streaming code, beyond the simpler approach in `generateController.js`.  

7. **Utils**  
   - **`aiClient.js`**  
     - **Purpose**: Handles communication with the AI (Claude) for SSE or standard requests.  
   - **`componentCache.js`**  
     - **Purpose**: Tools for parsing, storing, and retrieving code components from your DB.  
   - **`proposalParser.js`, `componentParser.js`**  
     - **Purpose**: Helpers to parse text from the AI into structured data (component blocks, proposals, etc.).  
   - **`tokenCheck.js`**  
     - **Purpose**: Middleware or helper to ensure user has enough “tokens_remaining” to perform an action; also has a `decrementTokens()` function.  
   - **`sseHelpers.js`**  
     - **Purpose**: Utilities for setting SSE headers or chunking SSE data properly.  

8. **`database.js`**  
   - **Purpose**: Exports your Sequelize/Prisma/Knex connection instance.  
   - **Connections**:  
     - Imported by all models so they can define their schemas and sync or migrate.  

---

#### **Frontend**

1. **`index.js`**  
   - **Purpose**: The React entry point; mounts `<App />` to the DOM.  

2. **`App.js`**  
   - **Purpose**: Top-level component that configures routes (React Router, if used), sets up global providers or contexts, and organizes the initial UI structure.  

3. **Pages** (found in `frontend/src/pages/`)  
   - **`HomePage.jsx`**  
     - **Purpose**: A simple landing or home page if needed.  
   - **`BetaSignUpPage.jsx`**  
     - **Purpose**: UI for user to join the beta. Submits to `POST /api/auth/beta-signup`.  
   - **`DashboardPage.jsx`**  
     - **Purpose**: Displays user projects, or a general overview of user’s data.  
   - **`ProposalPage.jsx`**  
     - **Purpose**: If using the two-step approach, shows the design proposal, allows refine/accept.  
   - **`GeneratePage.jsx`**  
     - **Purpose**: SSE-based generation page. The user enters prompt details, receives real-time code from the AI, and can “Accept” or “Stop.”  
   - **`ProjectEditorPage.jsx`**  
     - **Purpose**: Allows editing an existing project or version, with SSE calls to `POST /api/edit`.  

4. **Components** (found in `frontend/src/components/`)  
   - **`proposal/*`** (`ProposalForm.jsx`, `ProposalPreview.jsx`, `ProposalRevisions.jsx`)  
     - **Purpose**: Dedicated UI pieces for creating or viewing design proposals.  
   - **`cache/*`** (`CacheManager.jsx`, `CachedComponentList.jsx`)  
     - **Purpose**: UI around the cached components, controlling what’s stored or loaded.  
   - **`NavBar.jsx`, `ProjectCard.jsx`, `LivePreview.jsx`, `ComponentHighlighter.jsx`**  
     - **Purpose**: Shared or domain-specific UI elements.  
     - **`LivePreview`** is especially important for rendering the AI-generated React code in real-time.  

5. **Context** (found in `frontend/src/context/`)  
   - **`AuthContext.jsx`**  
     - **Purpose**: Manages the user’s login state, tokens, etc.  
   - **`ProposalContext.jsx`**  
     - **Purpose**: Provides a way to store or retrieve the active design proposal across multiple components.  
   - **`CacheContext.jsx`**  
     - **Purpose**: Similar pattern but for caching logic or data that multiple components need.  

6. **Hooks** (found in `frontend/src/hooks/`)  
   - **`useProposal.js`, `useCache.js`, `useComponentGeneration.js`**  
     - **Purpose**: Encapsulate logic for reusing in multiple components. For example, `useProposal.js` might fetch or update proposals, `useCache.js` might handle local vs. remote caching, etc.  

7. **Front-End Services** (found in `frontend/src/services/`)  
   - **`apiService.js`**  
     - **Purpose**: Generic fetch or SSE helpers (`startSSE`) for calling the backend.  
   - **`proposalService.js`**  
     - **Purpose**: Higher-level functions to handle proposal creation, acceptance, etc.  
   - **`cacheService.js`**  
     - **Purpose**: Functions to store or retrieve cached components from the backend.  

8. **`public/`**  
   - **Purpose**: Static assets (images, icons, etc.) that can be served directly by the front-end build.  

---

### Putting It All Together

1. **Frontend -> Backend**  
   - React pages call the appropriate route (`/api/whatever`) using **fetch**, **axios**, or **SSE**.  
   - The route triggers a **Controller** method that handles logic, interacts with **Services** or **Utils**, and updates/fetches from **Models** in the DB.  

2. **SSE Flow**  
   - `GeneratePage.jsx` or `ProjectEditorPage.jsx` initiates an SSE request → the server uses `generateController.js` or `editController.js` → those controllers call **`aiClient.js`** to stream data from Claude → chunked data is returned to the front-end for real-time updates.  

3. **Caching & Proposals**  
   - When new code is generated, if you’re using a caching approach, the system calls `CacheService.js` (or direct DB writes) to store each component.  
   - For the two-step design flow, `ProposalController.js` manages the intermediate design plan, stores it in `Proposal.js`, and references it during the final generation step.  

By following this “Visual Plan,” **Cursor IDE** or any contributor will have a clear mental map of the entire codebase, the flow of data, and the responsibilities of each file. If anything is unclear or you want more detail on a specific piece, just let me know!