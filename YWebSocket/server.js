import http from "http";
import { WebSocketServer } from "ws";
import { setupWSConnection } from "./utils.js";

const port = process.env.PORT || 1234;
const host = "0.0.0.0";

const server = http.createServer((request, response) => {
  response.writeHead(200, { "Content-Type": "text/plain" });
  response.end("Y-WebSocket server is running\n");
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", setupWSConnection);

server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

server.listen(port, host, () => {
  console.log("Y-WebSocket server running on port " + port);
});
