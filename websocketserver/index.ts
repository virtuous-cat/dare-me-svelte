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
import {
  addNewPlayer,
  checkDisco,
  checkKicked,
  expireGameKeys,
  getFullGameState,
  getHostId,
  getNewDaree,
  getPlayerDares,
  setDisco,
  unDisco,
  updateDares,
  updateReady,
} from "./queries.js";

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
>(server, {
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

io.on("connection", (socket) => {
  const gameRoom = socket.data.gameRoom;
  const playerId = socket.data.playerId;
  const playerName = socket.data.playerName;

  if (!gameRoom || !playerId || !playerName) {
    socket.disconnect(true);
    return;
  }

  // TODO: IP checking.
  async () => {
    const kicked = await checkKicked({ playerName, gameRoom });
    if (kicked) {
      socket.disconnect(true);
      return;
    }
  };

  if (!socket.recovered) {
    socket.join([gameRoom, playerId]);
  }

  (async () => {
    const savedPlayer = await addNewPlayer({ playerId, playerName, gameRoom });
    if (savedPlayer === "ERROR") {
      socket.emit("serverError");
    }
  })();

  socket.to(gameRoom).emit("newPlayerJoined", {
    playerId,
    playerName,
    ready: false,
  });

  socket.on("requestSync", async (callback) => {
    for (let tries = 0; tries <= 10; tries++) {
      const state = await getFullGameState(gameRoom);
      if (state) {
        callback(state);
        return;
      }
    }
    socket.emit("serverError");
  });

  socket.on("checkDisco", async (callback) => {
    const wasDisco = await checkDisco({ playerId, gameRoom });
    if (!wasDisco) {
      callback({ wasDisco });
      return;
    }
    const restoredPlayer = unDisco({ playerId, gameRoom });
    if (!restoredPlayer) {
      socket.emit("serverError");
    }
    const savedDares = await getPlayerDares({ playerId, gameRoom });
    if (typeof savedDares === "string") {
      callback({ wasDisco });
      console.error("Unable to restore dares on reconnect.");
      return;
    }
    callback({
      wasDisco,
      savedDareIds: savedDares.map(({ dareId }) => dareId),
    });
    const ready = await updateReady({ dares: savedDares, playerId, gameRoom });
    io.to(gameRoom).emit("playerReadinessUpdate", { playerId, ready });
  });

  socket.on("spin", async () => {
    socket.to(gameRoom).emit("spinning");
    const daree = await getNewDaree(gameRoom);
    const parsedDaree = PlayerIdSchema.safeParse(daree);
    if (!parsedDaree.success) {
      io.to(gameRoom).emit("dareeSelected", { error: daree });
      return;
    }
    const dareeDares = await getPlayerDares({ playerId: daree, gameRoom });
    if ("string" === typeof dareeDares) {
      io.to(gameRoom).emit("dareeSelected", { error: dareeDares });
      return;
    }
    io.to(gameRoom).emit("dareeSelected", {
      dareeId: parsedDaree.data,
      dareeDares,
    });
  });

  socket.on("chat", (message) => {
    io.to(gameRoom).emit("serverChat", {
      message,
      playerId,
      playerName,
    });
  });

  socket.on("kickPlayer", async ({ playerToKick, kicker }) => {
    const hostId = await getHostId(gameRoom);
    if (hostId !== kicker) {
      return;
    }
    io.to(gameRoom).emit("playerKicked", playerToKick);
    if (playerToKick === playerId) {
      socket.disconnect(true);
    }
  });

  socket.on("disconnect", async (reason) => {
    try {
      await setDisco({ playerId, gameRoom });
      await expireGameKeys(gameRoom);
    } catch (error) {
      console.error(error);
      console.error("Failed to set player as disco");
    }
    switch (reason) {
      case "server namespace disconnect":
        break;
      case "client namespace disconnect":
        io.to(gameRoom).emit("playerLeft", playerId);
        break;

      default:
        io.to(gameRoom).emit("playerDisconnected", playerId);
        break;
    }
  });
});

app.get("/healthcheck", (req, res) => {
  res.end("ok");
});

// SvelteKit should handle everything else using Express middleware
// https://github.com/sveltejs/kit/tree/master/packages/adapter-node#custom-server
app.use(handler);

server.listen(port);

console.log(`listening on port`, port);

process.on("SIGTERM", function () {
  console.log("SIGTERM called");
  server.close(function () {
    console.log("Finished all requests");
  });
});

process.on("SIGINT", function () {
  console.log("SIGINT called");
  server.close(function () {
    console.log("Finished all requests");
  });
});
