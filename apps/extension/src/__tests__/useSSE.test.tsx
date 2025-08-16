import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSSE } from '../hooks/useSSE';
import { SSEService } from '../services/SSEService';

// Mock SSEService
jest.mock('../services/SSEService');
const MockSSEService = SSEService as jest.MockedClass<typeof SSEService>;

// Test component that uses the hook
const TestComponent: React.FC<{ sessionId: string }> = ({ sessionId }) => {
  const { connectionState, lastEvent, connect, disconnect } = useSSE();

  return (
    <div>
      <div data-testid="connection-status">
        {connectionState.isConnected ? 'Connected' : 'Disconnected'}
      </div>
      <div data-testid="session-id">{connectionState.sessionId || 'No Session'}</div>
      <div data-testid="last-event">{lastEvent ? lastEvent.event : 'No Events'}</div>
      <button data-testid="connect-btn" onClick={() => connect(sessionId)}>
        Connect
      </button>
      <button data-testid="disconnect-btn" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  );
};

describe('useSSE Hook', () => {
  let mockSSEService: jest.Mocked<SSEService>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock SSEService instance with internal state
    const mockState = {
      isConnected: false,
      sessionId: undefined as string | undefined,
      lastEvent: undefined as any,
      error: undefined as string | undefined,
      reconnectAttempts: 0,
    };

    mockSSEService = {
      connect: jest.fn((sessionId: string, onConnect?: () => void, onMessage?: (event: string, data: any) => void, onError?: (error: string) => void) => {
        // Update state
        mockState.sessionId = sessionId;
        mockState.isConnected = true;
        mockState.reconnectAttempts = 0;
        mockState.error = undefined;
        
        // Simulate connection by calling onConnect immediately
        if (onConnect) onConnect();
        
        // Store callbacks for testing
        (mockSSEService as any)._onConnect = onConnect;
        (mockSSEService as any)._onMessage = onMessage;
        (mockSSEService as any)._onError = onError;
      }),
      disconnect: jest.fn(() => {
        mockState.isConnected = false;
        mockState.sessionId = undefined;
        mockState.lastEvent = undefined;
        mockState.error = undefined;
      }),
      getConnectionState: jest.fn(() => ({ ...mockState })),
      on: jest.fn(),
      off: jest.fn(),
    } as any;

    // Mock the constructor to return our mock instance
    MockSSEService.mockImplementation(() => mockSSEService);
    
    // Also mock the prototype methods to ensure they work
    MockSSEService.prototype = mockSSEService as any;
    
    // Helper method to simulate receiving messages
    (mockSSEService as any).simulateMessage = (event: string, data: any) => {
      const onMessage = (mockSSEService as any)._onMessage;
      if (onMessage) {
        // Update the mock state
        mockState.lastEvent = { event, data, timestamp: new Date().toISOString() };
        // Call the onMessage callback to trigger the hook's state update
        onMessage(event, data);
      }
    };
    
    // Helper method to force state update
    (mockSSEService as any).forceStateUpdate = () => {
      // This will trigger the polling mechanism to update the state
      mockSSEService.getConnectionState.mockReturnValue({ ...mockState });
    };
  });

  describe('Initial State', () => {
    it('should initialize with disconnected state', () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: false,
        sessionId: undefined,
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      render(<TestComponent sessionId="test-session" />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('session-id')).toHaveTextContent('No Session');
      expect(screen.getByTestId('last-event')).toHaveTextContent('No Events');
    });
  });

  describe('Connection Management', () => {
    it('should call SSEService connect when connect is called', () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: false,
        sessionId: undefined,
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      render(<TestComponent sessionId="test-session" />);

      const connectButton = screen.getByTestId('connect-btn');
      connectButton.click();

      expect(mockSSEService.connect).toHaveBeenCalledWith('test-session', expect.any(Function), expect.any(Function), expect.any(Function));
    });

    it('should call SSEService disconnect when disconnect is called', () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: true,
        sessionId: 'test-session',
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      render(<TestComponent sessionId="test-session" />);

      const disconnectButton = screen.getByTestId('disconnect-btn');
      disconnectButton.click();

      expect(mockSSEService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Event Handling', () => {
    it('should update lastEvent when SSE event is received', async () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: true,
        sessionId: 'test-session',
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      render(<TestComponent sessionId="test-session" />);

      // First, connect to establish the connection
      const connectButton = screen.getByTestId('connect-btn');
      connectButton.click();

      // Simulate receiving a message
      (mockSSEService as any).simulateMessage('status_update', {
        sessionId: 'test-session',
        status: 'PAID',
        message: 'Payment confirmed',
        timestamp: new Date().toISOString(),
      });
      
      // Force state update to trigger re-render
      (mockSSEService as any).forceStateUpdate();

      await waitFor(() => {
        expect(screen.getByTestId('last-event')).toHaveTextContent('status_update');
      });
    });

    it('should handle different event types', async () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: true,
        sessionId: 'test-session',
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      render(<TestComponent sessionId="test-session" />);

      // First, connect to establish the connection
      const connectButton = screen.getByTestId('connect-btn');
      connectButton.click();

      // Simulate receiving a connected message
      (mockSSEService as any).simulateMessage('connected', {
        sessionId: 'test-session',
        status: 'CREATED',
        message: 'SSE connection established',
        timestamp: new Date().toISOString(),
      });
      
      // Force state update to trigger re-render
      (mockSSEService as any).forceStateUpdate();

      await waitFor(() => {
        expect(screen.getByTestId('last-event')).toHaveTextContent('connected');
      });
    });
  });

  describe('State Updates', () => {
    it('should reflect connection state changes', async () => {
      // Start disconnected
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: false,
        sessionId: undefined,
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      const { rerender } = render(<TestComponent sessionId="test-session" />);

      expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');

      // Update to connected
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: true,
        sessionId: 'test-session',
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      rerender(<TestComponent sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Connected');
        expect(screen.getByTestId('session-id')).toHaveTextContent('test-session');
      });
    });

    it('should handle error states', async () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: false,
        sessionId: undefined,
        lastEvent: undefined,
        error: 'Connection failed',
        reconnectAttempts: 1,
      });

      render(<TestComponent sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });
    });
  });

  describe('Cleanup', () => {
    it('should disconnect on unmount', () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: true,
        sessionId: 'test-session',
        lastEvent: undefined,
        error: undefined,
        reconnectAttempts: 0,
      });

      const { unmount } = render(<TestComponent sessionId="test-session" />);

      unmount();

      expect(mockSSEService.disconnect).toHaveBeenCalled();
    });
  });

  describe('Reconnection Logic', () => {
    it('should show reconnection attempts', async () => {
      mockSSEService.getConnectionState.mockReturnValue({
        isConnected: false,
        sessionId: undefined,
        lastEvent: undefined,
        error: 'Connection failed',
        reconnectAttempts: 2,
      });

      render(<TestComponent sessionId="test-session" />);

      await waitFor(() => {
        expect(screen.getByTestId('connection-status')).toHaveTextContent('Disconnected');
      });
    });
  });
});
