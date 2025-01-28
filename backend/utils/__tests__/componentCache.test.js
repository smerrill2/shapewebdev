const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const mongoose = require('mongoose');
const CachedComponent = require('../../models/CachedComponent');
const { cacheComponent, getComponentHierarchy } = require('../componentCache');

// Mock the CachedComponent model
jest.mock('../../models/CachedComponent', () => {
  const mockModel = {
    deleteMany: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    aggregate: jest.fn()
  };
  return mockModel;
});

describe('Component Cache Utility', () => {
  let projectId;
  let versionId;

  beforeAll(() => {
    projectId = new mongoose.Types.ObjectId();
    versionId = new mongoose.Types.ObjectId();
  });

  beforeEach(async () => {
    await CachedComponent.deleteMany({});
  });

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default mock implementations
    CachedComponent.create.mockImplementation((data) => Promise.resolve({ 
      _id: new mongoose.Types.ObjectId(),
      ...data,
      isComplete: true
    }));

    CachedComponent.findOne.mockImplementation((query) => Promise.resolve({
      _id: new mongoose.Types.ObjectId(),
      name: query.name || 'TestComponent',
      code: 'export function TestComponent() { return <div>Test</div>; }',
      projectId: query.projectId || 'test-project',
      versionId: query.versionId || 'test-version',
      isComplete: true
    }));

    CachedComponent.find.mockResolvedValue([]);
    CachedComponent.aggregate.mockResolvedValue([]);
  });

  describe('cacheComponent', () => {
    it('should detect child components correctly', async () => {
      const componentCode = `
        export function ParentComponent() {
          return (
            <div>
              <ChildComponent />
            </div>
          );
        }
      `;

      const result = await cacheComponent(
        'ParentComponent',
        componentCode,
        'test-project',
        'test-version'
      );

      expect(result).toBeDefined();
      expect(CachedComponent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'ParentComponent',
          code: componentCode,
          projectId: 'test-project',
          versionId: 'test-version'
        })
      );
    });
  });

  describe('getComponentHierarchy', () => {
    it('should build component hierarchy correctly', async () => {
      const mockComponents = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'RootComponent',
          code: 'export function RootComponent() { return <div><ChildComponent /></div>; }',
          projectId: 'test-project',
          versionId: 'test-version',
          isComplete: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'ChildComponent',
          code: 'export function ChildComponent() { return <div>Child</div>; }',
          projectId: 'test-project',
          versionId: 'test-version',
          isComplete: true
        }
      ];

      CachedComponent.find.mockResolvedValueOnce(mockComponents);

      const hierarchy = await getComponentHierarchy('test-project', 'test-version');

      expect(hierarchy).toBeDefined();
      expect(hierarchy.roots).toHaveLength(1);
      expect(hierarchy.roots[0].component.name).toBe('RootComponent');
      expect(hierarchy.roots[0].children).toHaveLength(1);
      expect(hierarchy.roots[0].children[0].component.name).toBe('ChildComponent');
    });

    it('should detect circular dependencies', async () => {
      const mockComponents = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'ComponentA',
          code: 'export function ComponentA() { return <div><ComponentB /></div>; }',
          projectId: 'test-project',
          versionId: 'test-version',
          isComplete: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'ComponentB',
          code: 'export function ComponentB() { return <div><ComponentA /></div>; }',
          projectId: 'test-project',
          versionId: 'test-version',
          isComplete: true
        }
      ];

      CachedComponent.find.mockResolvedValueOnce(mockComponents);

      await expect(getComponentHierarchy('test-project', 'test-version'))
        .rejects
        .toThrow('Circular dependency detected');
    });

    it('should handle invalid component code gracefully', async () => {
      const mockComponents = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'InvalidComponent',
          code: 'invalid javascript code',
          projectId: 'test-project',
          versionId: 'test-version',
          isComplete: true
        }
      ];

      CachedComponent.find.mockResolvedValueOnce(mockComponents);

      const hierarchy = await getComponentHierarchy('test-project', 'test-version');

      expect(hierarchy).toBeDefined();
      expect(hierarchy.roots).toHaveLength(1);
      expect(hierarchy.roots[0].component.name).toBe('InvalidComponent');
      expect(hierarchy.roots[0].children).toHaveLength(0);
    });

    it('should handle missing parent components', async () => {
      const mockComponents = [
        {
          _id: new mongoose.Types.ObjectId(),
          name: 'ChildComponent',
          code: 'export function ChildComponent() { return <div>Child</div>; }',
          projectId: 'test-project',
          versionId: 'test-version',
          isComplete: true
        }
      ];

      CachedComponent.find.mockResolvedValueOnce(mockComponents);

      const hierarchy = await getComponentHierarchy('test-project', 'test-version');

      expect(hierarchy).toBeDefined();
      expect(hierarchy.roots).toHaveLength(1);
      expect(hierarchy.roots[0].component.name).toBe('ChildComponent');
    });
  });
});
