import {
  GameCodeSchema,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
  PlayerIdSchema,
} from "../src/lib/gametypes";

import { Server } from "socket.io";

export const webSocketServer = {
  name: "webSocketServer",
  //@ts-ignore
  configureServer(server) {
    const io = new Server<
      ClientToServerEvents,
      ServerToClientEvents,
      InterServerEvents,
      SocketData
    >(server?.httpServer);

    io.on("connection", (socket) => {
      socket.data.gameRoom = GameCodeSchema.parse(
        socket.handshake.auth.gameRoom
      );
      socket.data.playerId = PlayerIdSchema.parse(
        socket.handshake.auth.playerId
      );
      socket.data.playerName = socket.handshake.auth.playerName;

      socket.join([socket.data.gameRoom, socket.data.playerId]);

      socket.emit("syncGameState", { players: [] });

      socket.on("chat", (message) => {
        // TODO: remove as
        socket
          .to(socket.data.gameRoom as string)
          .emit("serverChat", {
            message,
            playerId: socket.data.playerId as string,
          });
      });
    });
  },
};
