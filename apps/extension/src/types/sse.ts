export interface SSEEvent {
  event: string;
  data: any;
  timestamp: string;
}

export interface ConnectedEvent {
  sessionId: string;
  status: string;
  message: string;
  timestamp: string;
}

export interface StatusUpdateEvent {
  sessionId: string;
  status: string;
  previousStatus?: string;
  message: string;
  timestamp: string;
}

export interface ErrorEvent {
  sessionId: string;
  error: string;
  message: string;
  timestamp: string;
}

export type SSEEventData = ConnectedEvent | StatusUpdateEvent | ErrorEvent;

export interface SSEConnectionState {
  isConnected: boolean;
  sessionId?: string;
  lastEvent?: SSEEvent;
  error?: string;
  reconnectAttempts: number;
}

export interface SSEConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}
