Below is an outline of **how** to handle multiple components streaming in, type them out (one at a time) in an animated preview, and **accumulate** them into a single final page preview. You can then adapt this plan to your existing code:

---

## 1. Tracking Multiple Components Separately

You want to:

1. **Animate** each component’s code as it arrives, from partial -> final.  
2. Once a component is finished (`isComplete: true`), **move on** to the next component.  
3. **Accumulate** each finished component’s code into a single “landing page” in your live preview.

### High-Level Steps

1. **Parse** SSE chunks to figure out which component they belong to (e.g. from a `/* Component: Xyz */` comment or `componentName` in metadata).  
2. Maintain an **array** of components (e.g. `componentList`), each item containing:
   - `componentName`
   - `codeSoFar` (text typed so far)
   - `isComplete` (boolean)
3. As partial code arrives for a given component, append it to that component’s `codeSoFar`.
   - If you see `isComplete: true`, mark it complete. Then the AnimatedPreview for that component can “finalize” the typed text and stop.  
4. **When a brand-new component** (e.g. `/* Component: NewComp */`) starts streaming, create a **new object** in `componentList` so you can start typing that code from scratch, **without** overwriting the old component’s text.
5. Each time a component finishes, **inject** it into your “big landing page preview.” That might mean **evaluating** the code, or just rendering “dummy placeholders” (depending on how your `LivePreview` is set up).

---

## 2. Front-End Data Structures

Create something like this in your main page or a global store:

```js
// Example structure
const [componentList, setComponentList] = useState([]);

/* Each item in componentList might look like:
{
  name: 'HeroSection',
  codeSoFar: 'import React...',
  isComplete: false
}
*/
```

### Tracking the “Active” Component

- You can keep a pointer to the **current** component that is receiving partial code. (Alternatively, you detect from SSE `metadata.componentName` if your back-end sends that.)
- If your back-end does not provide an explicit component name except as comments like `/* Component: FeatureGrid */`, you’ll parse them in front-end. The moment you detect `/* Component: Something */`, you do:

```js
setComponentList(prev => [
  ...prev,
  {
    name: 'Something',
    codeSoFar: '',
    isComplete: false
  }
]);
```

**Then** store that index (the newly added item) as your “active component index.”

---

## 3. Handling SSE Chunks in `GeneratePage.jsx`

You already have logic like:

```js
eventSource.onmessage = (event) => {
  const data = parseSSEData(event.data);

  // If data.type === 'code'
  //   => figure out which component this chunk belongs to
  //      => update that component’s codeSoFar
  // If data.isComplete
  //      => mark that component isComplete: true
  // If data.done => SSE is fully finished
};
```

### Distinguishing Components

- If your server includes a `metadata.componentName`, that’s easy:
  ```js
  if (data.metadata?.componentName) {
    const compName = data.metadata.componentName;
    // find or create an entry in componentList
  }
  ```
- If the server *doesn’t* give you `componentName` but just lumps new code with a comment `/* Component: Xyz */`, you can **scan** for that comment in the chunk:

  ```js
  const markerRegex = /\/\*\s*Component:\s*([A-Za-z0-9_]+)\s*\*\//;
  const match = data.code?.match(markerRegex);
  if (match) {
    const compName = match[1];
    // create new item in componentList
  }
  ```

**Note**: The chunk might appear in the middle of partial code, so watch for that carefully.  

---

## 4. Animating One Component at a Time in `<AnimatedPreview />`

### Approach: One `<AnimatedPreview />` per component

An **easy** approach is to render an `<AnimatedPreview />` **for each** item in `componentList`. So in your `GeneratePage.jsx` or `LivePreview.jsx`:

```jsx
{
  componentList.map((comp, index) => (
    <AnimatedPreview
      key={comp.name}
      code={comp.codeSoFar}
      isComplete={comp.isComplete}
    />
  ))
}
```

Now each component has its own typed text. You only feed the **accumulated** codeSoFar to that `<AnimatedPreview />`.  
- As new partial code arrives, you do:

```js
setComponentList(prev => {
  // find the item with name = data.componentName
  // update .codeSoFar += data.code
  return updatedList;
});
```

- `<AnimatedPreview code={comp.codeSoFar} />` sees the new code and continues animating from the old index to the new end.

**When** you see `isComplete: true`, you pass that to `<AnimatedPreview isComplete={true} />` so it knows, “Stop partial stepping once I’ve typed everything.”

---

## 5. “Reset” Animation for the Next Component

If you literally want the animation to *stop* once a component is done, then **start** from an empty string for the next component, the “one AnimatedPreview per component” approach is already perfect. Each new component starts from codeSoFar = `''` and partial-chunks get appended.  

**Alternatively**, if you want *one single `<AnimatedPreview />`* that is re-used for multiple components, you must:

1. Wait for the first component to complete (`isComplete: true`).  
2. “Finalize” that typed text. Maybe store it in a separate array or string.  
3. **Clear** `<AnimatedPreview />` state, set `displayText=""`, set `currentIndex=0`.  
4. Then feed it the new component’s partial code from scratch.  

This is a bit more manual. Usually it’s simpler to just have multiple previews or multiple “code sections.”

---

## 6. Combining the Components into a **Single** “Landing Page Preview”

### The “LivePreview” Compilation

You want the final *rendered* page to accumulate each finished component. Possibly your back-end code is truly React code, so you might do a “dynamic eval” or a Babel transform.  

**Key**: Once the user sees “HeroSection” is complete, your front end can compile that code into an actual React component and render it. Then once “FeatureGrid” is complete, you compile *that* code, and so on, until you have a `<div>` containing `<HeroSection /> <FeatureGrid /> <Footer />` etc.  

This can be done by:

1. Appending each finished component to your “global code store” in memory.  
2. Using something like a `<Sandbox />` or your “LivePreview.jsx” that transforms code with Babel + requires them.  
3. Rendering them in a single layout. For example:
   ```jsx
   function MyLandingPage() {
     return (
       <>
         <HeroSection />
         <FeatureGrid />
         <FooterSection />
       </>
     );
   }
   ```

But that requires you to dynamically link them (i.e. `export default HeroSection;` is compiled, then you store it under “HeroSection”). Or you do a text-based approach, where you eventually build a big file:

```js
const finalLandingPage = `
import HeroSection from './HeroSection';
import FeatureGrid from './FeatureGrid';
function LandingPage() {
  return (
    <>
      <HeroSection />
      <FeatureGrid />
    </>
  );
}
export default LandingPage;
`;
```

And let your `<LivePreview />` compile it. Implementation details vary, but *the key is each component you finalize gets included in the final page*.

---

## 7. Putting It All Together

**Pseudo-code** (assuming your SSE returns `metadata.componentName` or you parse it out yourself):

```js
// in GeneratePage.jsx or wherever you handle SSE
function handleSSEChunk(data) {
  if (data.type === 'code') {
    const compName = data.metadata?.componentName || parseComponentNameFrom(data.code);
    
    if (!compName) {
      // Could be design vision text or unknown
      // just display in an "intro text" preview or ignore
      return;
    }

    // find or create the relevant component in state
    setComponentList(prev => {
      let compIndex = prev.findIndex(c => c.name === compName);
      if (compIndex === -1) {
        // new component
        prev = [...prev, { name: compName, codeSoFar: '', isComplete: false }];
        compIndex = prev.length - 1;
      }

      // Append the new code chunk
      let updatedCode = prev[compIndex].codeSoFar + data.code;
      // if data.isPartial => keep going
      // if data.isComplete => set isComplete = true
      const isComplete = !!data.isComplete;

      const newComp = {
        ...prev[compIndex],
        codeSoFar: updatedCode,
        isComplete
      };
      
      const newArr = [...prev];
      newArr[compIndex] = newComp;
      return newArr;
    });
  }

  if (data.done) {
    // SSE is finished
  }
}
```

Then in your rendering:

```jsx
// We show each component's typed code
{
  componentList.map((comp) => (
    <AnimatedPreview 
      key={comp.name}
      code={comp.codeSoFar}
      isComplete={comp.isComplete}
    />
  ))
}

// And in <LivePreview/> or some other aggregator, we compile each fully-finished component 
// into a single rendered page. Possibly something like:
{componentList.map(comp => {
   if (!comp.isComplete) return null; 
   // Evaluate comp.codeSoFar with Babel?
   return <RenderedVersionOf code={comp.codeSoFar} />;
})}
```

**That** way:
- The user sees the typed-out code for each separate component, one after the other.  
- Once a component is `isComplete`, that code is stable, you can evaluate it and render it in your final page.

---

## TL;DR / Conclusion

1. **Use an array** to store multiple components, each with `codeSoFar`, `isComplete`, and a `name`.  
2. **In your SSE onmessage**: figure out which component the new chunk belongs to, **append** it, and if `isComplete = true`, mark it done.  
3. **Render** a `<AnimatedPreview/>` for each component so that each chunk is typed out in a dedicated area.  
4. **Compile** each fully-finished component’s code into your live “landing page.”  

This ensures:
- Every component’s code is typed from start to finish.  
- When the next component starts streaming, you do **not** overwrite the old code—just start a **new** `<AnimatedPreview/>`.  
- In the final “live preview,” you keep adding each newly-finished component to your overall page layout.

That’s the general strategy you need. If that matches your design goals—where you see each component typed out in order, then eventually you get a single final page with all components—this approach will do it!  

**Yes**, it’s definitely doable. You just have to manage separate “tracks” for each component’s typed text vs. final code. Once you wire it up this way, you won’t lose any typed code, and the final landing page can accumulate all the components as they are completed.