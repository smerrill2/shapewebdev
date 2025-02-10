import React from 'react';
import { DEBUG_MODE } from './utils/config';

const DevOverlay = ({ registry, streamingStates, debug = DEBUG_MODE }) => {
  if (!debug) return null;

  return (
    <div className="fixed bottom-4 right-4 p-4 bg-slate-900/90 rounded-lg shadow-lg border border-slate-700 text-xs max-w-[300px] max-h-[400px] overflow-auto">
      <h3 className="text-slate-300 font-medium mb-2">Debug Info</h3>
      
      {/* Registry Info */}
      <div className="mb-4">
        <h4 className="text-slate-400 mb-1">Registry Components:</h4>
        <div className="space-y-1">
          {Array.from(registry?.components || []).map(([id, component]) => (
            <div key={id} className="text-slate-500">
              {component.name} ({id})
              {component.isLayout && ' [Layout]'}
            </div>
          ))}
        </div>
      </div>

      {/* Streaming States */}
      <div>
        <h4 className="text-slate-400 mb-1">Streaming States:</h4>
        <div className="space-y-1">
          {Array.from(streamingStates || []).map(([id, state]) => (
            <div key={id} className="text-slate-500 flex items-center gap-2">
              <span>{id}:</span>
              {state.isStreaming && (
                <span className="text-emerald-400">Streaming</span>
              )}
              {state.isComplete && (
                <span className="text-blue-400">Complete</span>
              )}
              {state.error && (
                <span className="text-red-400">Error</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DevOverlay; 