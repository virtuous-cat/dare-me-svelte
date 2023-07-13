<script lang="ts">
  import { type Socket, io } from "socket.io-client";
  import type {
    ServerToClientEvents,
    ClientToServerEvents,
  } from "$lib/game.types";
  import type { ServerChat } from "$lib/game.types";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Button from "$lib/Button.svelte";

  let clientPlayerName: string;
  let clientPlayerId: string;
  let gameCode: string;

  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
    autoConnect: false,
  });

  function wipeStorage() {
    sessionStorage.removeItem("gameCode");
    sessionStorage.removeItem("playerId");
    sessionStorage.removeItem("playerName");
  }

  onMount(() => {
    clientPlayerName = sessionStorage.getItem("playerName") ?? "";
    clientPlayerId = sessionStorage.getItem("playerId") ?? "";
    gameCode = sessionStorage.getItem("gameCode") ?? "";

    if (!(clientPlayerId && clientPlayerName && gameCode)) {
      wipeStorage();
      goto("/?message=gameerror");
    }
    socket.auth = {
      gameRoom: gameCode,
      playerId: clientPlayerId,
      playerName: clientPlayerName,
    };
    socket.connect();

    return () => {
      socket.disconnect();
      socket.off("connect_error");
    };
  });

  let chatlog: ServerChat[] = [];

  let outgoingChat: string = "";

  let darer: string = "";

  let daree: string = "";

  function sendChat() {
    socket.emit("chat", outgoingChat);
    chatlog = [
      ...chatlog,
      {
        message: outgoingChat,
        playerId: clientPlayerId,
        playerName: clientPlayerName,
      },
    ];
    outgoingChat = "";
  }

  socket.on("connect_error", (err) => {
    if (err.message === "Invalid auth") {
      wipeStorage();
      goto("/?message=gameerror");
    }
  });

  socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
      wipeStorage();
      goto("/?message=gameerror");
    }
  });

  socket.on("serverChat", (message) => {
    chatlog = [...chatlog, message];
  });
</script>

<Button
  on:click={() => {
    socket.disconnect();
    wipeStorage();
    goto("/");
  }}>Leave Game</Button
>

<div class="chat">
  <ul class="chatlog">
    {#each chatlog as chat}
      <li><strong>{chat.playerName}: </strong>{chat.message}</li>
    {/each}
  </ul>
  <input
    type="textbox"
    name="chat"
    bind:value={outgoingChat}
    on:keydown={(e) => {
      if (e.key === "Enter") {
        sendChat();
      }
    }}
  /><Button on:click={sendChat}>Send</Button>
</div>
