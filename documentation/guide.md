```markdown
# Guide.md

This **Guide** document acts as an overarching strategy reference for your ShapeWeb system, tying together both the **Visual Plan** (found in `Visual_Plan.md`) and the **Integration Plan** (found in `Integration_Plan.md`). It breaks down the high-level steps required to build and maintain the application in **smaller pieces**, providing a coherent path for AI or human developers to follow.

---

## 1. **Introduction**

Welcome to the **ShapeWeb Project Guide**—a long-form document describing how to begin coding your AI-driven website generator **without getting lost**. Think of this Guide as a “master index” that points to:

1. **`Visual_Plan.md`**  
   - Shows the _big picture_ of the system using a **Mermaid diagram** and file relationships.  
2. **`Integration_Plan.md`**  
   - Presents the step-by-step instructions, sample code, and deeper technical details needed to scaffold, implement, and deploy the system.  

By reading **this** Guide first, you’ll know _which_ file or step to consult next, giving your tools—such as Cursor IDE—an explicit “table of contents” for generating and organizing code.

---

## 2. **Purpose of the Guide**

1. **Tie the Plans Together**  
   - **`Visual_Plan.md`** and **`Integration_Plan.md`** each have important details. The Visual Plan shows how the pieces fit, while the Integration Plan digs into specifics like SSE, routes, controllers, database models, and more. This document references each at the appropriate stage.

2. **Give a Sequential Roadmap**  
   - Rather than diving randomly into any single file, follow these steps to build or expand the codebase in a logical, stable manner.

3. **Prevent Developer or AI Confusion**  
   - Especially if you’re using an AI coding assistant, you want a linear “follow these steps, then link to these files” approach. This ensures the assistant doesn’t jump around between partially complete tasks.

---

## 3. **Reference Documents & Links**

- **Visual Plan** (`Visual_Plan.md`)  
  A top-level overview of **file structure** and **data flows**, supplemented by a **Mermaid diagram**. It reveals how back-end routes connect to controllers, how models integrate with controllers/services, and how the front-end pages, components, and contexts fit together.

- **Integration Plan** (`Integration_Plan.md`)  
  A step-by-step approach to building the system, complete with sample code blocks:
  - **Backend details**: SSE endpoints, database schemas, Node/Express routes, etc.  
  - **Frontend details**: Real-time rendering flows, snippet examples, SSE usage, multi-breakpoint previews, code examples for `GeneratePage`, `ProjectEditorPage`, etc.

Read each plan’s relevant sections at the recommended times indicated below.

---

## 4. **High-Level Sequence of Work**

Here is how we recommend you **start** building and integrating each piece, referencing **`Visual_Plan.md`** and **`Integration_Plan.md`** along the way:

1. **Set Up Backend Foundations**
   1. **Configure Database**  
      - Create your Postgres instance and run initial migrations or definitions.  
      - Refer to **`Integration_Plan.md`** Section “2.1 Database Layer (Postgres)” for pseudo-SQL and model examples.  
      - Then confirm how these models link to your `Visual_Plan.md` Mermaid chart (particularly the **Models** subgraph).
   2. **Initialize Express App**  
      - Check **`Integration_Plan.md`** Section “2.2 Express App Setup” for the recommended `app.js`, `server.js`, and route structure.  
      - Compare with the **`Visual_Plan.md`** diagram (Under “Backend → app.js & server.js” nodes).  

2. **Establish Core Routes and Controllers**
   1. **Auth Routes**  
      - In **`Integration_Plan.md`** see “2.3 Authentication & Beta Flow.” This ties in with the `auth.js` route and `authController.js`.  
      - The “Visual Plan” also references how `auth.js` (Routes) calls `authController.js` (Controllers), which in turn connects to `User.js`.  
   2. **Project & Version Routes**  
      - Refer to “2.7 Projects & Versions” in **`Integration_Plan.md`** to understand how the `projects.js` route calls `projectsController.js`.  
      - Then see the “Backend → Controllers → projectsController.js” block in **`Visual_Plan.md`** to see how it interacts with `Project` and `ProjectVersion`.  

3. **Implement SSE Logic for Generation & Edits**
   1. **Generate Flow**  
      - **`Integration_Plan.md`** covers “2.5 Generation (SSE).” This references your `generateController.js` hooking into `aiClient.js` for streaming.  
      - In **`Visual_Plan.md`**, the diagram shows how `generate.js` → `generateController.js` → `aiClient.js` → SSE flow.  
   2. **Edit Flow**  
      - Check “2.6 Edit (SSE)” in **`Integration_Plan.md`** for the snippet on `editController.js`.  
      - The “Visual Plan” clarifies how it’s basically parallel to the generation flow but modifies code snippets.  

4. **Front-End Integration**
   1. **Set Up Core Pages**  
      - **`Integration_Plan.md`** “3.1 High-Level Workflow” outlines an example front-end workflow: Beta sign-up → Dashboard → Generation → Editing.  
      - **`Visual_Plan.md`** details each page (e.g. `GeneratePage.jsx`, `ProjectEditorPage.jsx`) and how they call the back-end routes.
   2. **Create Real-Time Rendering**  
      - The “2.11 Core Component Implementations” (LivePreview, etc.) in **`Integration_Plan.md`** is vital.  
      - Cross-reference the **`Visual_Plan.md`** diagram, focusing on the “Components” subgraph (e.g. `LivePreview.jsx`) and how it interacts with SSE or store contexts.

5. **Caching & Design Proposal Flow**
   1. **Component Caching**  
      - “10. **Component Caching Strategy**” in **`Integration_Plan.md`** provides a blueprint for storing code chunks in `cached_components`.  
      - Then see the **`Visual_Plan.md`** subgraphs for **Models** (CachedComponent.js) and **Services** (CacheService.js).
   2. **Two-Step Proposal Flow**  
      - “11. **Two-Step Design Proposal Flow**” in **`Integration_Plan.md`** shows the recommended approach to generating a design plan first, then code.  
      - The “Visual Plan” clarifies how `proposals.js` or `proposalController.js` integrate into the system.  

---

## 5. **Where to Begin**

- **If setting up the backend** from scratch:  
  - Start with **`Integration_Plan.md`** Section **2.1** (Database) and Section **2.2** (Express App).  
  - Cross-check the **`Visual_Plan.md`** diagram under “Backend → Models” and “Backend → Routes.”  

- **If focusing on the front-end** first:  
  - Scan **`Integration_Plan.md`** Sections **3.1** (Workflow) and **3.2** (React Components).  
  - Then open **`Visual_Plan.md`** to see how each page (`GeneratePage.jsx`, `ProjectEditorPage.jsx`) connects to the back-end routes.  

- **If you’re building the SSE generation** specifically:  
  - Go to **`Integration_Plan.md`** “2.5 Generation (SSE)” and “2.6 Edit (SSE).”  
  - Compare that with **`Visual_Plan.md`** “Backend → generate.js → generateController.js” or “Backend → edit.js → editController.js.”  

---

## 6. **Detailed Breakdown**

This section breaks the system into **smaller pieces** to ensure each chunk is well understood before moving on.

1. **Core Infrastructure**  
   - **Models** + **Database** + **Migrations**.  
   - Link: [Integration_Plan.md -> 2.1 Database Layer](./Integration_Plan.md) and [Visual_Plan.md -> Models Subgraph](./Visual_Plan.md).  
2. **Auth & Beta Flow**  
   - (Optional) If using beta sign-ups.  
   - Link: [Integration_Plan.md -> 2.3 Authentication & Beta Flow](./Integration_Plan.md). Check the diagram [Visual_Plan.md -> Routes -> auth.js](./Visual_Plan.md).  
3. **Generation & Edit SSE**  
   - Implement or refine the SSE logic for real-time code streaming.  
   - Link: [Integration_Plan.md -> 2.5 Generation (SSE)](./Integration_Plan.md) or [2.6 Edit (SSE)](./Integration_Plan.md) plus [Visual_Plan.md -> generate.js and edit.js routes](./Visual_Plan.md).  
4. **Front-End Pages**  
   - Create or refine major pages: `GeneratePage.jsx`, `ProjectEditorPage.jsx`, `DashboardPage.jsx`.  
   - Link: [Integration_Plan.md -> 3.2 Example React Components](./Integration_Plan.md) and [Visual_Plan.md -> Frontend -> Pages subgraph](./Visual_Plan.md).  
5. **Component Caching**  
   - Save partial or final components in `cached_components` to speed up re-renders.  
   - Link: [Integration_Plan.md -> 10. Component Caching Strategy](./Integration_Plan.md) and [Visual_Plan.md -> Models -> CachedComponent.js & Services -> CacheService.js](./Visual_Plan.md).  
6. **Two-Step Proposal Flow**  
   - If using a design-first approach, refer to [Integration_Plan.md -> 11. Two-Step Design Proposal Flow](./Integration_Plan.md).  
   - Compare with [Visual_Plan.md -> Controllers -> proposalController.js](./Visual_Plan.md).  

---

## 7. **Advanced Topics & Notes**

1. **Icon System**  
   - If you need dynamic icons in LivePreview or are referencing `lucide-react`, see [Integration_Plan.md -> 9. Icon System Implementation](./Integration_Plan.md).  
2. **Multi-Breakpoint Preview**  
   - For user-friendly design views, [Integration_Plan.md -> 4. Multi-Breakpoint Preview](./Integration_Plan.md).  
3. **Exporting & GitHub Integration**  
   - Summaries and suggestions are in [Integration_Plan.md -> 7. Export to GitHub](./Integration_Plan.md).  
4. **Production Security**  
   - For environment configs, SSE timeouts, and security headers, see [Integration_Plan.md -> 12.4 Security & Deployment Considerations](./Integration_Plan.md).  

---

## 8. **Testing & QA**

1. **Test Strategy**  
   - Thorough tests ensure reliability. The recommended approach is in [Integration_Plan.md -> 13. Testing Strategy](./Integration_Plan.md).  
   - For an overview of coverage from unit to end-to-end tests, see that same section.  
2. **Where to Start**  
   - Begin with minimal integration tests for critical flows: SSE connections, database CRUD, token usage. Then expand to coverage for front-end user flows.  

---

## 9. **Long-Term Maintenance**

1. **Versioning**  
   - Keep `project_versions`, `proposal_revisions`, or `cached_components` updated with each release.  
2. **Caching & Performance**  
   - Monitor DB size, code snippet length, SSE concurrency.  
3. **Monitoring & Analytics**  
   - See [Integration_Plan.md -> 12.5 Monitoring & Error Handling](./Integration_Plan.md). Log key stats on generation success/failure, average times, etc.  

---

## 10. **Conclusion & Next Steps**

- This **Guide.md** is your master reference: it points to specific sections in **`Visual_Plan.md`** and **`Integration_Plan.md`** whenever you need deeper context or code snippets.  
- **Recommended Next Step**:  
  1. Read or skim the top-level diagram in **`Visual_Plan.md`** to orient yourself.  
  2. Jump into **`Integration_Plan.md`** to start implementing database connections, SSE endpoints, or front-end pages.  

By following the breakdown in this Guide, you’ll ensure each piece of the puzzle (backend routes, controllers, models, front-end pages/components, SSE logic, caching, etc.) is built in a logical order. Once the fundamentals are in place, you can add advanced features like multi-breakpoint previews, design proposals, or exporting to GitHub.

**Good luck, and happy coding!**