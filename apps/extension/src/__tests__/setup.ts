import '@testing-library/jest-dom';

// Mock Chrome extension APIs
Object.defineProperty(globalThis, 'chrome', {
  value: {
    runtime: {
      sendMessage: jest.fn(),
      onMessage: {
        addListener: jest.fn(),
        removeListener: jest.fn(),
      },
      getURL: jest.fn((path: string) => `chrome-extension://test-id/${path}`),
    },
    storage: {
      local: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
      },
      sync: {
        get: jest.fn(),
        set: jest.fn(),
        remove: jest.fn(),
      },
    },
    tabs: {
      query: jest.fn(),
      sendMessage: jest.fn(),
      create: jest.fn(),
    },
  },
  writable: true,
});

// Mock EventSource for SSE testing
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

// Mock EventSource globally
Object.defineProperty(globalThis, 'EventSource', {
  value: MockEventSource,
  writable: true,
});

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
Object.defineProperty(globalThis, 'console', {
  value: {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  writable: true,
});

// Mock fetch if needed
Object.defineProperty(globalThis, 'fetch', {
  value: jest.fn(),
  writable: true,
});

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.clearAllTimers();
});
