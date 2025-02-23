import { useReducer } from 'react';

// Action types
const ACTIONS = {
  START_COMPONENT: 'START_COMPONENT',
  APPEND_TO_COMPONENT: 'APPEND_TO_COMPONENT',
  COMPLETE_COMPONENT: 'COMPLETE_COMPONENT',
};

// Initial state
const initialState = {
  components: {},
};

// Reducer function
function componentReducer(state, action) {
  switch (action.type) {
    case ACTIONS.START_COMPONENT: {
      const { componentId, metadata } = action.payload;
      return {
        ...state,
        components: {
          ...state.components,
          [componentId]: {
            code: '',
            isComplete: false,
            metadata: metadata || {},
          },
        },
      };
    }

    case ACTIONS.APPEND_TO_COMPONENT: {
      const { componentId, codeDelta } = action.payload;
      const component = state.components[componentId];

      if (!component) {
        console.warn(`Component ${componentId} does not exist`);
        return state;
      }

      if (component.isComplete) {
        console.warn(`Cannot append to completed component: ${componentId}`);
        return state;
      }

      return {
        ...state,
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            code: component.code + codeDelta,
          },
        },
      };
    }

    case ACTIONS.COMPLETE_COMPONENT: {
      const { componentId } = action.payload;
      const component = state.components[componentId];

      if (!component) {
        console.warn(`Component ${componentId} does not exist`);
        return state;
      }

      return {
        ...state,
        components: {
          ...state.components,
          [componentId]: {
            ...component,
            isComplete: true,
          },
        },
      };
    }

    default:
      return state;
  }
}

export function useComponentRegistry() {
  const [state, dispatch] = useReducer(componentReducer, initialState);

  const startComponent = (componentId, metadata = {}) => {
    dispatch({
      type: ACTIONS.START_COMPONENT,
      payload: { componentId, metadata },
    });
  };

  const appendToComponent = (componentId, codeDelta) => {
    dispatch({
      type: ACTIONS.APPEND_TO_COMPONENT,
      payload: { componentId, codeDelta },
    });
  };

  const completeComponent = (componentId) => {
    dispatch({
      type: ACTIONS.COMPLETE_COMPONENT,
      payload: { componentId },
    });
  };

  const getComponents = () => {
    return state.components;
  };

  return {
    startComponent,
    appendToComponent,
    completeComponent,
    getComponents,
  };
} 