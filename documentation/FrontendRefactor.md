Below is a **step-by-step, detailed action plan** for implementing the proposed **frontend refactor** so we can "render ASAP," while still following clean architecture and TDD principles. Each step includes **what** to do, **why** it's important, and **how** to test it along the way.

---

## 1. Extract and Split the Babel Transformations ✅

### What We Did
1. **Created** a `transform/` directory within `frontend/src/components/`.
2. **Implemented** the core transformation utilities:
   - `fixIncompleteJSX.js`: Handles both well-formed and malformed JSX, with special handling for style attributes and function structure.
   - `applyTransformations.js`: Orchestrates the transformation pipeline in a specific order.

3. **Key Features Implemented**:
   - Smart detection of well-formed vs malformed JSX
   - Proper handling of style attributes and multi-line JSX
   - Return statement parentheses wrapping
   - Test ID injection
   - Validation of final JSX output

### Implementation Details
The transformation pipeline works in this order:
1. Clean the code (remove markers)
2. Remove React imports and boilerplate
3. Fix incomplete JSX
4. Inject test IDs
5. Final formatting
6. Validate JSX

For detailed implementation, see [BabelTransformations.md](./BabelTransformations.md).

### Tests Implemented
- **Unit tests** covering:
  - Well-formed JSX handling
  - Malformed JSX fixing
  - Style attribute repair
  - Test ID injection
  - Error handling and fallbacks
  - Development mode logging

### Why
- This decomposition mirrors how the backend separated marker validation and buffering.
- Each utility gets **focused** tests.

### How to Test
- **Unit tests** for each new file. For instance:
  1. `cleanCode.test.js`: Input code with `/// START` and `/// END` markers, expect them to be stripped out.  
  2. `fixIncompleteJSX.test.js`: Code with unclosed `<div>` or missing braces, ensure it's corrected.  
  3. `injectTestIds.test.js`: Confirm a snippet lacking `data-testid` ends up with the correct attribute.  
  4. `applyTransformations.test.js`: Confirm the composition of all utilities in a typical scenario (incomplete code gets cleaned, test IDs get injected, etc.).

---

## 2. Implement a Dedicated Component Registry

### What to Do
1. **Create** a new file: `componentRegistry.js` (or a React hook named `useComponentRegistry.js`) in `frontend/src/components/streaming/` or a similar subfolder.
2. **Export** an object/class or a hook with methods:
   - `startComponent(componentId, metadata)`  
   - `appendToComponent(componentId, codeDelta)`  
   - `completeComponent(componentId)`  
   - `getComponents()` or a read-only selector for the current components.

3. If you choose a **React hook** approach:
   - Use a `useReducer` or `useState` to store a `Map` or a plain JS object.  
   - Provide the above methods as callbacks.

### Why
- This is analogous to the backend's `componentBuffer`.  
- Central place to accumulate partial code from SSE events, making it easier to manage streaming states and avoid burying that logic in the UI.

### How to Test
- **Unit test** `componentRegistry.js`:
  - Call `startComponent("comp1", { position: "header" })`, confirm the registry has a new entry for `"comp1"`.
  - Call `appendToComponent("comp1", "some code")`, check that code is accumulated properly.
  - Call `completeComponent("comp1")`, ensure the registry marks that component as "complete."
  - Attempt appending code after `completeComponent`, confirm it either ignores or throws an error (depending on your desired behavior).

---

## 3. Create the SSE Listener (or Hook)

### What to Do
1. **Create** a file: `SSEListener.js` or `useSSEListener.js` in `frontend/src/components/streaming/`.
2. Within it:
   - **Initialize** an EventSource to `/api/generate` (or the correct SSE endpoint).  
   - **Parse** each event (likely JSON) to see if it's `content_block_start`, `content_block_delta`, or `content_block_stop`.
   - For each event:
     - **Call** `registry.startComponent(...)`, `registry.appendToComponent(...)`, or `registry.completeComponent(...)` as appropriate.

3. Optionally, if you want the SSE logic to be more "service-like," you can:
   - Keep SSEListener as a non-React class that just triggers callbacks.  
   - Or, if you prefer React, create a hook that uses `useEffect` to open EventSource on mount.

### Why
- Separates SSE logic from the rendering logic.  
- Matches the backend pattern: we have a "service" reading raw AI chunk data, then handing it off to the "buffer."

### How to Test
- **Unit test** the SSE listener by **mocking** the EventSource:
  1. Simulate an event: `{ type: 'content_block_start', metadata: { componentId: '123' }}`.  
  2. Confirm your `componentRegistry` is called with `startComponent("123")`.
  3. Continue with `content_block_delta` and `content_block_stop` events, verifying the registry updates.  
  4. Test error conditions (invalid JSON, etc.).

---

## 4. Refactor the "SimpleLivePreview" into a Cleaner "LivePreview" Component

### What to Do
1. **Rename** `SimpleLivePreview.jsx` → `LivePreview.jsx` (or keep the name—up to you).  
2. **Remove** the direct SSE handling from this component. Instead:
   - It receives a list or map of components from the new `componentRegistry`.
   - For each component, it calls `applyTransformations` (the composed function from Step 1).  
   - It renders them with React-Live (as you do now).
3. **Use** a dedicated error boundary (`EnhancedErrorBoundary`) or the React-Live `<LiveError>` approach for syntax errors.
4. **Ensure** it shows placeholders or loading states if `isComplete` is `false` for any components (optional).

### Why
- This keeps `LivePreview` as purely a **presentation** component that knows how to take a code snippet → transform → display.

### How to Test
- **Unit test** `LivePreview` with **mock** data:
  1. Pass in an array of fully complete code snippets, confirm they're all rendered.  
  2. Pass in partial code for one snippet (simulate streaming), confirm it either doesn't render until complete or shows partial results (depending on your logic).
  3. Pass in code that has a syntax error, confirm `EnhancedErrorBoundary` or `<LiveError>` is displayed.

---

## 5. Isolate the EnhancedErrorBoundary

### What to Do
1. **Move** `EnhancedErrorBoundary` into a standalone file: `EnhancedErrorBoundary.jsx`.  
2. Give it a small **unit test** in `EnhancedErrorBoundary.test.jsx` to confirm it catches errors and renders a fallback.

### Why
- Allows reuse across your app, not just for Live Preview.  
- Easier to test in isolation.

### How to Test
- **Unit test** using React Testing Library's approach to intentionally throw errors within a child component and confirm the boundary captures them.

---

## 6. Update `LivePreviewTestPage.jsx` (or your Demo Page)

### What to Do
1. **Remove** the SSE logic from `LivePreviewTestPage.jsx`. Instead, do something like:
   ```jsx
   import React from 'react';
   import { SSEListener } from './streaming/SSEListener';
   import { useComponentRegistry } from './streaming/componentRegistry';
   import LivePreview from './LivePreview';

   function LivePreviewTestPage() {
     const registry = useComponentRegistry(); // Or however you provide it

     // SSEListener automatically updates `registry`
     // or call SSEListener in an effect to keep it active

     return (
       <div>
         <h1>Live Preview Test</h1>
         <LivePreview components={registry.getComponents()} />
       </div>
     );
   }
   ```
2. **Optionally** keep your test prompts / scenario logic here if you want a UI for starting different SSE streams.

### Why
- Ensures the test page is just an example consumer, not the core logic.  
- Matches the backend's "thin controller" approach—just hooking things up, not doing the heavy lifting.

### How to Test
- **Manual QA** by opening the test page and verifying it streams from the backend correctly.  
- A **simple integration test** that fakes SSE events can confirm the final rendered output in `LivePreviewTestPage`.

---

## 7. Write or Update Integration Tests (E2E or "Full Flow")

### What to Do
1. **Use** your testing framework of choice (Jest + React Testing Library, Cypress, etc.).
2. **Mock** the entire SSE flow:
   - Fire `content_block_start` event for "ButtonComponent," send partial code lines, then a `content_block_stop`.
   - Confirm the UI eventually shows a rendered "ButtonComponent" in the preview.
3. **Check** that partial code is handled gracefully (maybe a spinner or placeholder if the snippet is incomplete).
4. **Check** that code with syntax errors triggers the error boundary.

### Why
- Ensures the entire pipeline (SSE → registry → transformations → render) works end-to-end, just like the backend has SSE → generatorState → etc.

---

## Putting It All Together

Here's the **chronological** order to follow:

1. **Extract transformations** into smaller files, write unit tests.  
2. **Build the component registry** and test it (like the backend's `componentBuffer`).  
3. **Implement or refine SSEListener** to parse SSE events, calling the registry, and test it with mocked SSE.  
4. **Refactor `LivePreview`** to focus purely on code transformation + rendering.  
5. **Isolate `EnhancedErrorBoundary`**, give it its own file + test.  
6. **Clean up `LivePreviewTestPage`** so it's just a simple consumer, no heavy logic.  
7. **Add integration tests** to confirm the full SSE → transform → render flow.

---

## Final Expected Outcome

- A fully **modular** frontend:
  - One place (the registry) to store partial code.  
  - One place (the SSE listener) to handle incoming events.  
  - Clearly separated code transformation utilities, each with its own test.  
  - A simpler `LivePreview` component that's purely about "take final code + show it."  
- **Improved test coverage** at every layer:
  - Unit tests for transformations, the registry, and SSE logic.  
  - Integration or E2E tests for the entire streaming flow.
- **Easier maintenance and extension**:  
  - Adding a new transform utility or hooking into a new SSE event type is straightforward—update or add a relevant module, plus a test.

Following this plan should let you **render AI-generated components reliably** while having a **clean**, **testable**, and **maintainable** frontend codebase that parallels all the improvements you made on the backend.