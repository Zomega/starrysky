import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";

export class LabelerSubscriptionServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ noServer: true });

    server.on("upgrade", (request, socket, head) => {
      const url = new URL(request.url || "/", `http://${request.headers.host}`);
      if (url.pathname === "/xrpc/com.atproto.label.subscribeLabels") {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit("connection", ws, request);
        });
      }
    });

    this.wss.on("connection", (ws) => {
      console.log("[LabelerServer] New subscription client connected");
      this.clients.add(ws);

      ws.on("close", () => {
        this.clients.delete(ws);
      });
    });
  }

  public broadcastLabel(label: any) {
    const message = JSON.stringify({
      $type: "com.atproto.label.subscribeLabels#labels",
      labels: [label],
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }
}
