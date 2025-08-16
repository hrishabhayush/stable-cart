import { SSEService } from '../services/SSEService';
import { SSEEvent, SSEConnectionState } from '../types/sse';

// Mock EventSource
class MockEventSource {
  public url: string;
  public readyState: number;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  public onclose: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;
    this.readyState = 0; // CONNECTING
  }

  public close() {
    this.readyState = 2; // CLOSED
    if (this.onclose) {
      this.onclose(new Event('close'));
    }
  }

  public simulateOpen() {
    this.readyState = 1; // OPEN
    if (this.onopen) {
      this.onopen(new Event('open'));
    }
  }

  public simulateMessage(data: string) {
    if (this.onmessage) {
      const event = new MessageEvent('message', { data });
      this.onmessage(event);
    }
  }

  public simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Mock global EventSource is handled in setup.ts

describe('SSEService', () => {
  let sseService: SSEService;
  let mockEventSource: MockEventSource;

  beforeEach(() => {
    sseService = new SSEService();
    mockEventSource = new MockEventSource('http://localhost:65535/api/checkout-sessions/test-session/events');
  });

  afterEach(() => {
    sseService.disconnect();
  });

  describe('Connection Management', () => {
    it('should establish connection successfully', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Check that sessionId is set
      expect(sseService.getConnectionState().sessionId).toBe('test-session');
      
      // Simulate connection opening to establish connection
      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateOpen();
      
      expect(sseService.getConnectionState().isConnected).toBe(true);
      expect(onConnect).toHaveBeenCalled();
    });

    it('should handle connection open event', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate connection open
      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateOpen();

      expect(onConnect).toHaveBeenCalled();
      expect(sseService.getConnectionState().isConnected).toBe(true);
    });

    it('should handle connection close', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      sseService.disconnect();

      expect(sseService.getConnectionState().isConnected).toBe(false);
      expect(sseService.getConnectionState().sessionId).toBeUndefined();
    });
  });

  describe('Event Handling', () => {
    it('should parse and handle connected event', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate connected event
      const connectedEvent = {
        event: 'connected',
        data: {
          sessionId: 'test-session',
          status: 'CREATED',
          message: 'SSE connection established',
          timestamp: new Date().toISOString()
        }
      };

      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateMessage(`event: ${connectedEvent.event}\ndata: ${JSON.stringify(connectedEvent.data)}\n\n`);

      expect(onMessage).toHaveBeenCalledWith(connectedEvent.event, connectedEvent.data);
    });

    it('should parse and handle status update event', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate status update event
      const statusEvent = {
        event: 'status_update',
        data: {
          sessionId: 'test-session',
          status: 'PAID',
          previousStatus: 'PENDING',
          message: 'Payment confirmed',
          timestamp: new Date().toISOString()
        }
      };

      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateMessage(`event: ${statusEvent.event}\ndata: ${JSON.stringify(statusEvent.data)}\n\n`);

      expect(onMessage).toHaveBeenCalledWith(statusEvent.event, statusEvent.data);
    });

    it('should handle malformed events gracefully', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate malformed event
      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateMessage('invalid event format');

      // Should not crash and should not call onMessage
      expect(onMessage).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle connection errors', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate connection error
      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateError();

      expect(onError).toHaveBeenCalled();
      expect(sseService.getConnectionState().error).toBeDefined();
    });

    it('should attempt reconnection on error', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate connection error
      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateError();

      // Should attempt reconnection
      expect(sseService.getConnectionState().reconnectAttempts).toBeGreaterThan(0);
    });
  });

  describe('State Management', () => {
    it('should return current connection state', () => {
      const state = sseService.getConnectionState();
      
      expect(state).toHaveProperty('isConnected');
      expect(state).toHaveProperty('sessionId');
      expect(state).toHaveProperty('lastEvent');
      expect(state).toHaveProperty('error');
      expect(state).toHaveProperty('reconnectAttempts');
    });

    it('should update state on connection', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate connection opening to establish connection
      const eventSource = (sseService as any).eventSource as MockEventSource;
      eventSource.simulateOpen();
      
      const state = sseService.getConnectionState();
      expect(state.isConnected).toBe(true);
      expect(state.sessionId).toBe('test-session');
      expect(state.reconnectAttempts).toBe(0);
    });
  });

  describe('Reconnection Logic', () => {
    it('should not reconnect if max attempts reached', () => {
      const onConnect = jest.fn();
      const onMessage = jest.fn();
      const onError = jest.fn();

      sseService.connect('test-session', onConnect, onMessage, onError);
      
      // Simulate multiple errors to reach max attempts
      const eventSource = (sseService as any).eventSource as MockEventSource;
      for (let i = 0; i < 5; i++) {
        eventSource.simulateError();
      }

      const state = sseService.getConnectionState();
      expect(state.reconnectAttempts).toBeLessThanOrEqual(3); // Max attempts
    });
  });
});
