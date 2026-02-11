import { io, Socket } from 'socket.io-client';

export interface HealingEvent {
  method: string;
  score: number;
  info: string;
  status: string;
}

class SocketService {
  private socket: Socket | null = null;
  private readonly URL = 'http://localhost:3000/events'; // Adjust port/path if needed

  connect() {
    if (this.socket) return;
    this.socket = io(this.URL);

    this.socket.on('connect', () => {
      console.log('[SocketService] Connected to ' + this.URL);
    });

    this.socket.on('disconnect', () => {
      console.log('[SocketService] Disconnected');
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  onHealing(scenarioId: string, callback: (data: HealingEvent) => void) {
    if (!this.socket) return;
    this.socket.on(`scenario/${scenarioId}/healing`, callback);
  }

  offHealing(scenarioId: string) {
    if (!this.socket) return;
    this.socket.off(`scenario/${scenarioId}/healing`);
  }

  onLoadMetrics(loadTestId: string, callback: (metrics: any) => void) {
    if (!this.socket) return;
    this.socket.on(`load-test/${loadTestId}/metrics`, callback);
  }

  offLoadMetrics(loadTestId: string) {
    if (!this.socket) return;
    this.socket.off(`load-test/${loadTestId}/metrics`);
  }

  onRecorderStop(sessionId: string, callback: (data: { steps: any[] }) => void) {
    if (!this.socket) return;
    this.socket.on(`recorder/${sessionId}/stopped`, callback);
  }

  offRecorderStop(sessionId: string) {
    if (!this.socket) return;
    this.socket.off(`recorder/${sessionId}/stopped`);
  }

  onProgress(scenarioId: string, callback: (data: { current: number; total: number; type: string }) => void) {
    if (!this.socket) return;
    this.socket.on(`scenario/${scenarioId}/progress`, callback);
  }

  offProgress(scenarioId: string) {
    if (!this.socket) return;
    this.socket.off(`scenario/${scenarioId}/progress`);
  }

  onMappingStatus(projectId: string, callback: (data: { status: string; pagesMapped?: number; error?: string }) => void) {
    if (!this.socket) return;
    this.socket.on(`project/${projectId}/mapping-status`, callback);
  }

  offMappingStatus(projectId: string) {
    if (!this.socket) return;
    this.socket.off(`project/${projectId}/mapping-status`);
  }

  onStatus(scenarioId: string, callback: (data: { status: string }) => void) {
    if (!this.socket) return;
    this.socket.on(`scenario/${scenarioId}/status`, callback);
  }

  offStatus(scenarioId: string) {
    if (!this.socket) return;
    this.socket.off(`scenario/${scenarioId}/status`);
  }
}

export const socketService = new SocketService();
