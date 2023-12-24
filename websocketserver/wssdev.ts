import {
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
  PlayerIdSchema,
  GameCodeValidator,
  PlayerNameValidator,
} from "../src/lib/game.types";
import { getNewDaree } from "./queries.js";

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
    >(server?.httpServer, {
      connectionStateRecovery: {
        // the backup duration of the sessions and the packets
        maxDisconnectionDuration: 2 * 60 * 1000,
        // whether to skip middlewares upon successful recovery
        skipMiddlewares: true,
      },
    });

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

    io.on("connection", (socket): void => {
      const gameRoom = socket.data.gameRoom;
      const playerId = socket.data.playerId;
      const playerName = socket.data.playerName;

      if (!gameRoom || !playerId || !playerName) {
        socket.disconnect(true);
        return;
      }

      if (!socket.recovered) {
        socket.join([gameRoom, playerId]);

        socket.emit("syncGameState", { players: [], hostId: "" });
      }

      socket.on("spin", async () => {
        const daree = await getNewDaree(gameRoom);
      });

      socket.on("chat", (message) => {
        io.to(gameRoom).emit("serverChat", {
          message,
          playerId,
          playerName,
        });
      });
    });
  },
};
