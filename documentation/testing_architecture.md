# Testing Architecture Documentation

## Overview
This document outlines the testing architecture for the ShapeWeb project, focusing on the backend component generation and streaming system.

## Running Tests

### Basic Commands
```bash
# Run all tests
npm test

# Run a specific test file
npm test backend/tests/unit/componentBuffer.test.js

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Coverage Reports
Coverage reports are generated using Jest's built-in coverage reporter. After running `npm run test:coverage`, you can find the detailed report in:
```
backend/coverage/lcov-report/index.html
```

The project maintains a minimum coverage threshold of:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

## Core Components Under Test

### 1. MarkerValidator
- **Purpose**: Validates component markers in the code stream
- **Key Features**:
  - Validates START/END markers
  - Handles position attributes (header, main, footer)
  - Normalizes whitespace and component names
  - Validates component name format
- **Test Coverage**:
  - Basic marker validation
  - Whitespace handling
  - Position validation
  - Component name validation
  - Edge cases and error handling

### 2. ComponentBuffer
- **Purpose**: Manages component storage and validation during generation
- **Key Features**:
  - Component storage and retrieval
  - Size limits and content trimming
  - Validation hooks
  - Component completion tracking
- **Test Coverage**:
  - Basic component operations
  - Validation and hooks
  - Size management
  - Metadata and statistics

### 3. GeneratorState
- **Purpose**: Manages the state of component generation and marker processing
- **Key Features**:
  - Processes text chunks for markers
  - Tracks nesting level for code blocks
  - Handles compound components
  - Manages critical components
- **Test Coverage**:
  - Basic chunk processing
  - Nested marker handling
  - Compound component validation
  - Critical component handling
  - Error cases and edge conditions

### 4. GeneratePageService
- **Purpose**: Coordinates the generation process and handles streaming
- **Key Features**:
  - Chunk processing and event generation
  - Error handling and thresholds
  - Timeout management
  - Statistics tracking
- **Test Coverage**:
  - Chunk processing
  - Error handling
  - Timeout mechanism
  - Statistics and cleanup

## Testing Strategy

### Unit Tests
Each component has dedicated unit tests that verify:
1. Core functionality
2. Edge cases
3. Error handling
4. Integration with related components

### Test Organization
Tests are organized in the following structure:
```
backend/tests/
  ├── unit/
  │   ├── markerValidator.test.js
  │   ├── componentBuffer.test.js
  │   ├── generatorState.test.js
  │   └── generatePageService.test.js
  └── integration/
      └── (future integration tests)
```

### Testing Best Practices
1. **Isolation**: Each test suite runs with a fresh instance of the component
2. **Comprehensive Coverage**: Tests cover happy paths, error cases, and edge conditions
3. **Clear Structure**: Tests are organized in descriptive blocks using `describe` and `test`
4. **Meaningful Assertions**: Tests use specific assertions that clearly indicate what's being verified

## Event Flow

### Component Generation Events
1. **Start Event**:
   ```javascript
   {
     type: 'content_block_start',
     metadata: {
       componentId,
       componentName,
       position,
       isCompoundComplete,
       isCritical
     }
   }
   ```

2. **Delta Event**:
   ```javascript
   {
     type: 'content_block_delta',
     metadata: {
       componentId,
       componentName,
       position,
       isCompoundComplete,
       isCritical
     },
     delta: { text: content }
   }
   ```

3. **Stop Event**:
   ```javascript
   {
     type: 'content_block_stop',
     metadata: {
       componentId,
       componentName,
       position,
       isComplete,
       isCompoundComplete,
       isCritical
     }
   }
   ```

### Status Events
```javascript
{
  type: 'status',
  status: 'generating' | 'completed',
  metadata: {
    totalChunks,
    parseErrors,
    lastChunkTime,
    components
  }
}
```

## Error Handling

### Error Types
1. **Parse Errors**: When chunks can't be parsed as JSON
2. **Threshold Errors**: When too many parse errors occur in a time window
3. **Write Errors**: When the response stream encounters issues
4. **Timeout Errors**: When generation exceeds the timeout limit

### Error Event Format
```javascript
{
  type: 'error',
  code: 'ERROR_CODE',
  message: 'Human readable message',
  error: 'Detailed error information',
  retryable: boolean
}
```

## Integration Testing

### Planned Integration Tests
The `backend/tests/integration/` directory will contain end-to-end tests covering:

1. **Full Generation Flow**
   ```javascript
   describe('Full Generation Flow', () => {
     test('generates complete page with multiple components', async () => {
       const response = await request(app)
         .post('/api/generate')
         .send({
           prompt: 'test prompt',
           style: 'modern',
           requirements: ['responsive']
         });
       // Assertions for SSE stream content
     });
   });
   ```

2. **Error Recovery Flow**
   ```javascript
   describe('Error Recovery', () => {
     test('recovers from stream interruption', async () => {
       // Test implementation
     });
   });
   ```

3. **Component Dependencies**
   ```javascript
   describe('Component Dependencies', () => {
     test('handles nested component generation', async () => {
       // Test implementation
     });
   });
   ```

### Integration Test Tools
- **Supertest**: HTTP assertions
- **Jest**: Test runner and assertions
- **SSE-Tester**: Custom utility for testing SSE streams
- **Mock-AI-Client**: Mock AI response generator

## CI/CD Integration

### GitHub Actions Workflow
Tests are automatically run on:
- Pull request creation/updates
- Push to main branch
- Daily scheduled runs

```yaml
# Example workflow
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm install
      - name: Run tests
        run: npm test
      - name: Upload coverage
        uses: codecov/codecov-action@v2
```

### Pre-commit Hooks
Local test validation is enforced using husky:
```bash
# .husky/pre-commit
npm test -- --findRelatedTests
```

## Future Improvements
1. Add integration tests for full generation flow
2. Implement performance benchmarks
3. Add coverage for edge cases in compound components
4. Enhance error recovery mechanisms 