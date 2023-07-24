import "dotenv/config";

import { Server } from "socket.io";
import { createServer } from "http";
import express from "express";
import { handler } from "../build/handler.js";
import {
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
  PlayerIdSchema,
  GameCodeValidator,
  PlayerNameValidator,
} from "../src/lib/game.types.js";

process.env.REDIS_URL;

const port = process.env.PORT;
if (!port) {
  throw new Error("No PORT in env");
}
const app = express();
const server = createServer(app);

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server);

io.use((socket, next) => {
  const roomResult = GameCodeValidator.safeParse(
    socket.handshake.auth.gameRoom
  );
  console.log(roomResult);
  const idResult = PlayerIdSchema.safeParse(socket.handshake.auth.playerId);
  console.log(idResult);
  const nameResult = PlayerNameValidator.safeParse(
    socket.handshake.auth.playerName
  );
  console.log(nameResult);
  if (!roomResult.success) {
    console.log(roomResult.error);
    return next(new Error("Invalid auth"));
  }
  if (!idResult.success) {
    console.log(idResult.error);
    return next(new Error("Invalid auth"));
  }
  if (!nameResult.success) {
    console.log(nameResult.error);
    return next(new Error("Invalid auth"));
  }
  socket.data.gameRoom = roomResult.data;
  socket.data.playerId = idResult.data;
  socket.data.playerName = nameResult.data;
  next();
});

io.on("connection", (socket) => {
  const gameRoom = socket.data.gameRoom;
  const playerId = socket.data.playerId;
  const playerName = socket.data.playerName;

  if (!gameRoom || !playerId || !playerName) {
    socket.disconnect(true);
    return;
  }

  socket.join([gameRoom, playerId]);

  socket.emit("syncGameState", { players: [] });

  socket.on("chat", (message) => {
    socket.to(gameRoom).emit("serverChat", {
      message,
      playerId,
      playerName,
    });
  });
});

// SvelteKit should handle everything else using Express middleware
// https://github.com/sveltejs/kit/tree/master/packages/adapter-node#custom-server
app.use(handler);

server.listen(port);

console.log(`listening on port`, port);
