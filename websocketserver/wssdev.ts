import { Server } from "socket.io";

export const webSocketServer = {
  name: "webSocketServer",
  //@ts-ignore
  configureServer(server) {
    const io = new Server(server?.httpServer);

    io.on("connection", (socket) => {
      socket.emit("serverChat", "Hello, World 👋");
    });
  },
};
