import { SSEEvent, SSEConnectionState, SSEConfig } from '../types/sse';

export class SSEService {
  private eventSource: EventSource | null = null;
  private connectionState: SSEConnectionState = {
    isConnected: false,
    sessionId: undefined,
    lastEvent: undefined,
    error: undefined,
    reconnectAttempts: 0,
  };
  private config: SSEConfig = {
    url: 'http://localhost:3001', // ✅ Updated to your backend port
    reconnectInterval: 1000,
    maxReconnectAttempts: 3,
    heartbeatInterval: 30000,
  };
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private eventListeners: Map<string, Set<Function>> = new Map();

  constructor(config?: Partial<SSEConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  public connect(
    sessionId: string,
    onConnect?: () => void,
    onMessage?: (event: string, data: any) => void,
    onError?: (error: string) => void
  ): void {
    if (this.connectionState.isConnected) {
      this.disconnect();
    }

    this.connectionState.sessionId = sessionId;
    this.connectionState.reconnectAttempts = 0;
    this.connectionState.error = undefined;

    const url = `${this.config.url}/api/checkout-sessions/${sessionId}/events`;
    
    try {
      this.eventSource = new EventSource(url);
      this.setupEventSourceHandlers(onConnect, onMessage, onError);
    } catch (error) {
      this.handleError(`Failed to create EventSource: ${error}`);
      if (onError) onError(`Failed to create EventSource: ${error}`);
    }
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.heartbeatTimer) {
      clearTimeout(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.connectionState.isConnected = false;
    this.connectionState.sessionId = undefined;
    this.connectionState.lastEvent = undefined;
    this.connectionState.error = undefined;
    
    // Emit disconnected event
    this.emit('disconnected');
  }

  public getConnectionState(): SSEConnectionState {
    return { ...this.connectionState };
  }

  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private setupEventSourceHandlers(
    onConnect?: () => void,
    onMessage?: (event: string, data: any) => void,
    onError?: (error: string) => void
  ): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.connectionState.isConnected = true;
      this.connectionState.error = undefined;
      this.connectionState.reconnectAttempts = 0;
      
      if (onConnect) onConnect();
      this.emit('connected');
      
      // Start heartbeat
      this.startHeartbeat();
    };

    this.eventSource.onmessage = (event: MessageEvent) => {
      try {
        const parsedEvent = this.parseSSEEvent(event.data);
        if (parsedEvent) {
          this.connectionState.lastEvent = parsedEvent;
          this.emit(parsedEvent.event, parsedEvent.data);
          
          if (onMessage) {
            onMessage(parsedEvent.event, parsedEvent.data);
          }
        }
      } catch (error) {
        console.warn('Failed to parse SSE event:', error);
      }
    };

    this.eventSource.onerror = () => {
      this.handleError('EventSource error occurred');
      if (onError) onError('EventSource error occurred');
      this.attemptReconnection();
    };

    // Note: EventSource doesn't have onclose, we handle disconnection in onerror
    // and through the close() method call
  }

  private parseSSEEvent(data: string): SSEEvent | null {
    const lines = data.split('\n');
    let eventType = 'message';
    let eventData = '';

    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.substring(6).trim();
      } else if (line.startsWith('data:')) {
        eventData = line.substring(5).trim();
      }
    }

    if (!eventData) return null;

    try {
      const parsedData = JSON.parse(eventData);
      return {
        event: eventType,
        data: parsedData,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Failed to parse SSE data:', error);
      return null;
    }
  }

  private handleError(error: string): void {
    this.connectionState.error = error;
    this.connectionState.isConnected = false;
    this.emit('error', error);
  }

  private attemptReconnection(): void {
    if (this.connectionState.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.handleError('Max reconnection attempts reached');
      return;
    }

    this.connectionState.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(() => {
      if (this.connectionState.sessionId) {
        this.connect(
          this.connectionState.sessionId,
          undefined,
          undefined,
          undefined
        );
      }
    }, this.config.reconnectInterval * this.connectionState.reconnectAttempts);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState.isConnected) {
        this.emit('heartbeat');
      } else {
        if (this.heartbeatTimer) {
          clearTimeout(this.heartbeatTimer);
          this.heartbeatTimer = null;
        }
      }
    }, this.config.heartbeatInterval);
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }
}
