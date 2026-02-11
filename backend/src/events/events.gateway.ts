import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'events',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`[EventsGateway] Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`[EventsGateway] Client disconnected: ${client.id}`);
  }

  emitLog(sessionId: string, log: any) {
    this.server?.emit(`scenario/${sessionId}/log`, log);
  }

  emitStatus(sessionId: string, status: string) {
    this.server?.emit(`scenario/${sessionId}/status`, { status });
  }

  emitHealing(sessionId: string, healingInfo: any) {
    this.server?.emit(`scenario/${sessionId}/healing`, healingInfo);
  }

  emitLoadMetrics(loadTestId: string, metrics: any) {
    this.server?.emit(`load-test/${loadTestId}/metrics`, metrics);
  }

  emitRecordingStopped(sessionId: string, steps: any[]) {
    this.server?.emit(`recorder/${sessionId}/stopped`, { steps });
  }

  emitProgress(sessionId: string, progress: { current: number; total: number; type: string }) {
    this.server?.emit(`scenario/${sessionId}/progress`, progress);
  }

  emitMappingStatus(projectId: string, status: { status: string; pagesMapped?: number; error?: string }) {
    this.server?.emit(`project/${projectId}/mapping-status`, status);
  }
}
