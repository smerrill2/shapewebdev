# System Architecture

## Component Generation and Testing Flow

```mermaid
graph TB
    subgraph "Frontend"
        Client[React Client]
        EventSource[EventSource]
        ComponentRenderer[Component Renderer]
    end

    subgraph "Backend API"
        Controller[Generate Controller]
        AIClient[AI Client]
        
        subgraph "Generation Pipeline"
            GPS[GeneratePageService]
            GS[GeneratorState]
            CB[ComponentBuffer]
        end
        
        subgraph "Testing Infrastructure"
            Jest[Jest Runner]
            
            subgraph "Unit Tests"
                MVT[MarkerValidator Tests]
                CBT[ComponentBuffer Tests]
                GST[GeneratorState Tests]
                GPST[GeneratePageService Tests]
            end
            
            subgraph "Integration Tests"
                E2E[End-to-End Tests]
                SSE[SSE Stream Tests]
            end
        end
    end

    %% Frontend Flow
    Client -->|POST /api/generate| Controller
    Controller -->|SSE Events| EventSource
    EventSource -->|Updates| ComponentRenderer

    %% Generation Pipeline
    Controller -->|Start Generation| AIClient
    AIClient -->|Text Chunks| GPS
    GPS -->|Process Chunks| GS
    GS -->|Store Components| CB
    CB -->|Events| GPS
    GPS -->|Stream Events| Controller

    %% Testing Flow
    Jest -->|Runs| MVT & CBT & GST & GPST
    Jest -->|Runs| E2E & SSE
    MVT -->|Validates| GS
    CBT -->|Validates| CB
    GST -->|Validates| GS
    GPST -->|Validates| GPS
    E2E -->|Validates| Controller
    SSE -->|Validates| Controller

    classDef frontend fill:#d4eaff,stroke:#333,stroke-width:2px;
    classDef backend fill:#ffe7d4,stroke:#333,stroke-width:2px;
    classDef pipeline fill:#d4ffd9,stroke:#333,stroke-width:2px;
    classDef testing fill:#ffd4d4,stroke:#333,stroke-width:2px;

    class Client,EventSource,ComponentRenderer frontend;
    class Controller,AIClient backend;
    class GPS,GS,CB pipeline;
    class Jest,MVT,CBT,GST,GPST,E2E,SSE testing;
```

## Component Processing Sequence

```mermaid
sequenceDiagram
    participant C as Client
    participant GC as GenerateController
    participant AI as AIClient
    participant GPS as GeneratePageService
    participant GS as GeneratorState
    participant CB as ComponentBuffer

    C->>GC: POST /api/generate
    activate GC
    GC->>AI: Start generation
    activate AI

    rect rgb(200, 255, 200)
        note over AI,CB: Component Generation Loop
        loop For each AI chunk
            AI->>GPS: Generate text chunk
            activate GPS
            GPS->>GS: Process chunk
            activate GS
            GS->>CB: Store component
            CB-->>GS: Component events
            GS-->>GPS: Processed events
            deactivate GS
            GPS-->>GC: Stream events
            deactivate GPS
            GC-->>C: SSE event
        end
    end

    AI-->>GC: Generation complete
    deactivate AI
    GC-->>C: message_stop event
    deactivate GC
```

## Testing Architecture

```mermaid
graph LR
    subgraph "Test Runner"
        Jest[Jest]
    end

    subgraph "Unit Tests"
        MVT[MarkerValidator Tests]
        CBT[ComponentBuffer Tests]
        GST[GeneratorState Tests]
        GPST[GeneratePageService Tests]
    end

    subgraph "Integration Tests"
        E2E[End-to-End Tests]
        SSE[SSE Tests]
        Mock[Mock AI Client]
    end

    subgraph "Coverage"
        Istanbul[Istanbul]
        Report[Coverage Report]
    end

    Jest -->|Runs| MVT & CBT & GST & GPST
    Jest -->|Runs| E2E & SSE
    E2E & SSE -->|Uses| Mock
    Jest -->|Generates| Istanbul
    Istanbul -->|Creates| Report

    classDef runner fill:#f9f,stroke:#333,stroke-width:2px;
    classDef tests fill:#ff9,stroke:#333,stroke-width:2px;
    classDef coverage fill:#9ff,stroke:#333,stroke-width:2px;

    class Jest runner;
    class MVT,CBT,GST,GPST,E2E,SSE,Mock tests;
    class Istanbul,Report coverage;
```

## Event Flow

```mermaid
stateDiagram-v2
    [*] --> Initializing: POST /api/generate
    Initializing --> Generating: Start AI Stream
    
    state Generating {
        [*] --> ProcessingChunk
        ProcessingChunk --> DetectingMarkers: Process Text
        DetectingMarkers --> StoringComponent: START Marker
        StoringComponent --> StreamingEvents: Generate Events
        StreamingEvents --> ProcessingChunk: Next Chunk
    }
    
    Generating --> Completing: AI Stream End
    Completing --> [*]: Send message_stop
    
    state "Error Handling" as ErrorState {
        TimeoutError
        ParseError
        StreamError
    }
    
    Generating --> ErrorState: Error Detected
    ErrorState --> Completing: Error Recovery
    ErrorState --> [*]: Fatal Error
```

These diagrams illustrate:
1. The overall system architecture and component relationships
2. The detailed sequence of component generation and streaming
3. The testing infrastructure and coverage reporting
4. The state flow of the event generation system

Key aspects highlighted:
- Frontend-Backend communication via SSE
- Component generation pipeline
- Test coverage and organization
- Error handling and recovery paths
- State management and transitions 