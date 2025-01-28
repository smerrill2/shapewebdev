# **Progress Tracker**

_Use this file to track high-level tasks, their references, and the current implementation status._

## Legend for Status
- **Not Started**: No code or work has begun on this item.
- **In Progress**: Actively being developed.
- **Completed**: Implementation done & tested.

---

## 1. Core Infrastructure

| **Task**                                                                 | **Reference**                                                     | **Status**     | **Notes**                             |
|-------------------------------------------------------------------------|-------------------------------------------------------------------|---------------|---------------------------------------|
| **1.1** – Set up & verify DB migrations (Users, Projects, etc.)         | Implementation Guide §1.1, Visual Plan – DB Layout                | In Progress   | MongoDB connection handling improved   |
| **1.2** – Implement ORM models (User, Project, ProjectVersion)          | Implementation Guide §1.1                                         | In Progress   | Basic models implemented with Mongoose |
| **1.3** – Add `Proposals` table/model (optional)                        | Two-Step Flow Plan §DB Changes, Integration Plan §2.1            | Not Started   |                                       |
| **1.4** – Add `cached_components` table/model & indexes                 | Caching Strategy §10.1                                            | Completed     | Component caching with validation implemented |
| **1.5** – Authentication & Beta signup flow                             | Implementation Guide §2.3, Admin Dashboard references             | Not Started   |                                       |

---

## 2. Design Proposal Flow

| **Task**                                                            | **Reference**                                                         | **Status**     | **Notes**                             |
|--------------------------------------------------------------------|-----------------------------------------------------------------------|---------------|---------------------------------------|
| **2.1** – Create `POST /api/generate/proposal` endpoint            | Integration Plan §11.1, Implementation Strategy §2.1                  | Not Started   |                                       |
| **2.2** – Store design plan in DB (Proposals table)                | Implementation Strategy §2.1, Two-Step Flow                           | Not Started   |                                       |
| **2.3** – Add front-end form for audience, brand style, etc.       | Implementation Guide §3.1, GeneratePage.jsx (Proposal UI)             | Not Started   |                                       |
| **2.4** – Display returned design plan & “Accept” or “Refine”       | Implementation Guide §3.1, Two-Step Flow Plan                         | Not Started   |                                       |
| **2.5** – (Optional) Refinement endpoint: `PUT /proposal/:id`       | Integration Plan §11.1.2, Two-Step Flow                               | Not Started   |                                       |
| **2.6** – Mark proposal as accepted (`POST /proposal/:id/accept`)   | Implementation Strategy §2.2                                          | Not Started   |                                       |

---

## 3. Final Generation (SSE)

| **Task**                                                                         | **Reference**                                                 | **Status**     | **Notes**                             |
|---------------------------------------------------------------------------------|---------------------------------------------------------------|---------------|---------------------------------------|
| **3.1** – Create `POST /api/generate/final` with SSE code streaming             | Implementation Strategy §3.1, Integration Plan §11.1, SSE Flow | Completed   | SSE streaming implemented with proper headers and error handling |
| **3.2** – Merge accepted proposal into final generation prompt                  | Two-Step Flow Plan §11.1, Implementation Guide §2.5            | Not Started   |                                       |
| **3.3** – Front-end SSE handling: read chunked code & render in real time       | Implementation Guide §3.2, GeneratePage.jsx – SSE logic        | In Progress   | Basic SSE client handling implemented |
| **3.4** – Display partial code in `LivePreview` or a raw text area              | Implementation Guide §3.2, LivePreview integration             | Not Started   |                                       |
| **3.5** – “Accept final code” → create a new Project & ProjectVersion           | Integration Plan – Projects & Versions, Implementation Guide §2.7 | Not Started |                                       |

---

## 4. Caching Integration

| **Task**                                                                      | **Reference**                               | **Status**     | **Notes**                            |
|-------------------------------------------------------------------------------|---------------------------------------------|---------------|--------------------------------------|
| **4.1** – Parse SSE chunks for complete components (detect boundaries)        | Implementation Strategy §4.1, SSE chunk parsing  | Not Started   |                                      |
| **4.2** – Insert each completed snippet into `cached_components`             | Implementation Strategy §4.1, Caching Strategy §10.2 | Not Started   |                                      |
| **4.3** – Associate cached components with a “draft” or ephemeral version     | Implementation Strategy §4.1, ProjectVersion refs  | Not Started   |                                      |
| **4.4** – Integrate parse & insert logic in `generateController.js`           | Implementation Strategy §4.1 (SSE + caching) | Not Started   |                                      |
| **4.5** – Confirm partial generation is captured if user disconnects          | Implementation Strategy §4.3, chunk-based caching | Not Started   |                                      |

---

## 5. Editing & Version Control

| **Task**                                                                        | **Reference**                                          | **Status**     | **Notes**                             |
|--------------------------------------------------------------------------------|--------------------------------------------------------|---------------|---------------------------------------|
| **5.1** – Implement `POST /api/edit` SSE for single-component edits            | Implementation Strategy §5.1, Edit Flow                | Not Started   |                                       |
| **5.2** – Add a “select component” UI in `ProjectEditorPage`                   | Implementation Guide §3.2, Editor flow                 | Not Started   |                                       |
| **5.3** – On user edit, fetch snippet from `cached_components` & SSE update    | Implementation Strategy §5.1, Caching Strategy §10.2   | Not Started   |                                       |
| **5.4** – Mark or create new `project_version` on each “Save”                  | Implementation Guide §2.7, Integration Plan – versioning | Not Started |                                       |
| **5.5** – Provide a versions list & revert option (optional)                   | Advanced step, not mandatory for MVP                   | Not Started   |                                       |

---

## 6. Refinement & Polishing

| **Task**                                                                                    | **Reference**                                                         | **Status**     | **Notes**                            |
|--------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|---------------|--------------------------------------|
| **6.1** – Add UI polishing with shadcn/ui or similar                                        | Implementation Guide UI references                                    | Not Started   |                                      |
| **6.2** – Security & privacy checks (JWT, sandboxing, GDPR, etc.)                          | Q&A: Security #1, #3, Privacy concerns                                | Not Started   |                                      |
| **6.3** – DevOps: set up CI/CD, environment configs, logging                                | Q&A: Deployment #2, Integration Plan final steps                       | Not Started   |                                      |
| **6.4** – Beta feedback & QA, user testing of the new two-step flow                         | Two-Step Flow Plan, Implementation Strategy #7.2 (Testing)             | Not Started   |                                      |
| **6.5** – Optimize SSE under load & handle AI rate limits                                  | Q&A: Performance #3, AI Rate Limits #6                                | Not Started   |                                      |
| **6.6** – (Optional) Payment & subscription model if scaling beyond beta                   | Q&A: Tokens & Payment #5, Business decisions                           | Not Started   |                                      |

---

## 7. Additional or Future Considerations

| **Task**                                                                     | **Reference**                                  | **Status**     | **Notes**                       |
|-----------------------------------------------------------------------------|------------------------------------------------|---------------|---------------------------------|
| **7.1** – GitHub/Netlify integration (export or deploy code)                | Future step (Integration Plan #8.1)            | Not Started   |                                 |
| **7.2** – Advanced sandboxing for user-generated React code                 | Q&A: Security #3 (Malicious code concerns)     | Not Started   |                                 |
| **7.3** – Team collaboration features (multi-user editing, concurrency)     | Q&A: Collaboration #1                          | Not Started   |                                 |
| **7.4** – Additional caching for repeated prompts (AI cost saving)          | Q&A: Performance & Caching #1, Implementation  | Not Started   |                                 |

---

### How to Update
- Change **Status** to “In Progress” or “Completed” as you work.
- Add **Notes** (e.g., commit IDs, short explanations).
- Feel free to add new rows under each section, or create new sections if needed.
