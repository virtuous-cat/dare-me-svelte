<script lang="ts">
  import { Socket, io } from "socket.io-client";
  import type {
    ServerToClientEvents,
    ClientToServerEvents,
  } from "../../../lib/gametypes";
  import type { ServerChat } from "../../../lib/gametypes";
  import { goto } from "$app/navigation";

  const clientPlayerName = sessionStorage.getItem("playerName") ?? "";
  const clientPlayerId = sessionStorage.getItem("playerId") ?? "";
  const gameCode = sessionStorage.getItem("gameCode") ?? "";

  if (!clientPlayerId || !clientPlayerName || !gameCode) {
    goto("/?message=gameerror");
  }

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
    autoConnect: false,
  });
  socket.auth = {
    gameRoom: gameCode,
    playerId: clientPlayerId,
    playerName: clientPlayerName,
  };
  socket.connect();

  let chatlog: ServerChat[] = [];

  let outgoingChat: string = "";

  let darer: string = "";

  let daree: string = "";

  socket.on("serverChat", (message) => {
    chatlog = [...chatlog, message];
  });
</script>

<a href="/">Leave Game</a>

<div class="chat">
  <ul class="chatlog">
    {#each chatlog as chat}
      <li>{chat}</li>
    {/each}
  </ul>
  <input type="text" name="chat" bind:value={outgoingChat} /><button
    on:click={() => {
      socket.emit("chat", outgoingChat);
      chatlog = [
        ...chatlog,
        { message: outgoingChat, playerId: clientPlayerId },
      ];
    }}>Send</button
  >
</div>
