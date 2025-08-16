import { useState, useEffect, useCallback, useRef } from 'react';
import { SSEService } from '../services/SSEService';
import { SSEEvent, SSEConnectionState } from '../types/sse';

export const useSSE = () => {
  const [connectionState, setConnectionState] = useState<SSEConnectionState>({
    isConnected: false,
    sessionId: undefined,
    lastEvent: undefined,
    error: undefined,
    reconnectAttempts: 0,
  });
  const [lastEvent, setLastEvent] = useState<SSEEvent | undefined>(undefined);
  
  const sseServiceRef = useRef<SSEService | null>(null);
  const isConnectedRef = useRef(false);

  // Initialize SSE service
  useEffect(() => {
    if (!sseServiceRef.current) {
      sseServiceRef.current = new SSEService();
    }

    return () => {
      if (sseServiceRef.current) {
        sseServiceRef.current.disconnect();
      }
    };
  }, []);

  // Update connection state periodically
  useEffect(() => {
    if (!sseServiceRef.current) return;

    const updateState = () => {
      const state = sseServiceRef.current!.getConnectionState();
      setConnectionState(state);
      isConnectedRef.current = state.isConnected;
    };

    const interval = setInterval(updateState, 100);

    return () => clearInterval(interval);
  }, []);

  const connect = useCallback((sessionId: string) => {
    if (!sseServiceRef.current) return;

    const onConnect = () => {
      console.log('SSE connection established');
    };

    const onMessage = (event: string, data: any) => {
      const sseEvent: SSEEvent = {
        event,
        data,
        timestamp: new Date().toISOString(),
      };
      setLastEvent(sseEvent);
      console.log('SSE message received:', sseEvent);
    };

    const onError = (error: string) => {
      console.error('SSE connection error:', error);
    };

    sseServiceRef.current.connect(sessionId, onConnect, onMessage, onError);
  }, []);

  const disconnect = useCallback(() => {
    if (sseServiceRef.current) {
      sseServiceRef.current.disconnect();
    }
  }, []);

  // Listen for specific events
  const on = useCallback((event: string, callback: Function) => {
    if (sseServiceRef.current) {
      sseServiceRef.current.on(event, callback);
    }
  }, []);

  const off = useCallback((event: string, callback: Function) => {
    if (sseServiceRef.current) {
      sseServiceRef.current.off(event, callback);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sseServiceRef.current) {
        sseServiceRef.current.disconnect();
      }
    };
  }, []);

  return {
    connectionState,
    lastEvent,
    connect,
    disconnect,
    on,
    off,
    isConnected: connectionState.isConnected,
    sessionId: connectionState.sessionId,
    error: connectionState.error,
    reconnectAttempts: connectionState.reconnectAttempts,
  };
};
