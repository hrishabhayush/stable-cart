import React from 'react';
import { useSSE } from '../hooks/useSSE';
import { SSEEvent } from '../types/sse';

interface RealTimeStatusProps {
  sessionId: string;
  onStatusChange?: (status: string) => void;
}

export const RealTimeStatus: React.FC<RealTimeStatusProps> = ({ 
  sessionId, 
  onStatusChange 
}) => {
  const { 
    connectionState, 
    lastEvent, 
    connect, 
    disconnect, 
    isConnected, 
    error, 
    reconnectAttempts 
  } = useSSE();

  // Connect to SSE when component mounts
  React.useEffect(() => {
    if (sessionId) {
      connect(sessionId);
    }

    return () => {
      disconnect();
    };
  }, [sessionId, connect, disconnect]);

  // Notify parent of status changes
  React.useEffect(() => {
    if (lastEvent && onStatusChange) {
      onStatusChange(lastEvent.data.status);
    }
  }, [lastEvent, onStatusChange]);

  // Get status display text
  const getStatusText = (): string => {
    if (!isConnected) {
      if (error) {
        return `Connection Error: ${error}`;
      }
      if (reconnectAttempts > 0) {
        return `Reconnecting... (${reconnectAttempts}/3)`;
      }
      return 'Connecting...';
    }

    if (!lastEvent) {
      return 'Waiting for updates...';
    }

    switch (lastEvent.event) {
      case 'connected':
        return `Connected - Status: ${lastEvent.data.status}`;
      case 'status_update':
        return `Status: ${lastEvent.data.status}`;
      case 'error':
        return `Error: ${lastEvent.data.message}`;
      default:
        return `Event: ${lastEvent.event}`;
    }
  };

  // Get status color
  const getStatusColor = (): string => {
    if (!isConnected) {
      if (error) return 'text-red-500';
      if (reconnectAttempts > 0) return 'text-yellow-500';
      return 'text-gray-500';
    }

    if (!lastEvent) return 'text-blue-500';

    switch (lastEvent.event) {
      case 'connected':
        return 'text-green-500';
      case 'status_update':
        return 'text-blue-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  // Get connection indicator
  const getConnectionIndicator = (): string => {
    if (isConnected) return '🟢';
    if (error) return '🔴';
    if (reconnectAttempts > 0) return '🟡';
    return '⚪';
  };

  return (
    <div className="real-time-status p-4 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">
          Real-time Status
        </h3>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {getConnectionIndicator()}
          </span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Session ID */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Session ID:</span>
          <span className="text-sm font-mono text-gray-800">
            {sessionId.substring(0, 8)}...
          </span>
        </div>

        {/* Current Status */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Status:</span>
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {/* Last Event */}
        {lastEvent && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Last Event:</span>
            <span className="text-sm text-gray-800">
              {lastEvent.event}
            </span>
          </div>
        )}

        {/* Timestamp */}
        {lastEvent && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Updated:</span>
            <span className="text-sm text-gray-800">
              {new Date(lastEvent.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {/* Reconnection Info */}
        {reconnectAttempts > 0 && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Reconnection:</span>
            <span className="text-sm text-yellow-600">
              Attempt {reconnectAttempts}/3
            </span>
          </div>
        )}
      </div>

      {/* Connection Controls */}
      <div className="flex space-x-2 mt-4">
        {!isConnected ? (
          <button
            onClick={() => connect(sessionId)}
            className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
          >
            Reconnect
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="px-3 py-2 bg-red-500 text-white text-sm rounded hover:bg-red-600 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-700">
            <strong>Error:</strong> {error}
          </p>
        </div>
      )}
    </div>
  );
};
