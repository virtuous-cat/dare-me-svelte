<script lang="ts">
  import { type Socket, io } from "socket.io-client";
  import type {
    ServerToClientEvents,
    ClientToServerEvents,
    Player,
  } from "$lib/game.types";
  import type { ServerChat } from "$lib/game.types";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Button from "$lib/Button.svelte";
  import { page } from "$app/stores";
  import type { DareWithTags, GameDare } from "$lib/db.types";

  let clientPlayerName: string = "Player Name";
  let clientPlayerId: string = "bed95d35-9040-4c77-a5a4-55aab4bfe878";
  let gameCode: string = "C0DE";

  // const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  //   autoConnect: false,
  // });

  function wipeStorage() {
    console.log("storage wiped");
    // sessionStorage.removeItem("gameCode");
    // sessionStorage.removeItem("playerId");
    // sessionStorage.removeItem("playerName");
  }

  // onMount(() => {
  //   clientPlayerName = sessionStorage.getItem("playerName") ?? "";
  //   clientPlayerId = sessionStorage.getItem("playerId") ?? "";
  //   gameCode = sessionStorage.getItem("gameCode") ?? "";

  //   if (!(clientPlayerId && clientPlayerName && gameCode)) {
  //     wipeStorage();
  //     goto("/?message=gameerror");
  //   }
  //   socket.auth = {
  //     gameRoom: gameCode,
  //     playerId: clientPlayerId,
  //     playerName: clientPlayerName,
  //   };
  //   socket.connect();

  //   return () => {
  //     socket.disconnect();
  //     socket.off("connect_error");
  //   };
  // });

  let chatlog: ServerChat[] = [];

  let outgoingChat: string = "";

  let darer: string = "";

  let daree: string = "";

  function sendChat() {
    // socket.emit("chat", outgoingChat);
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

  // socket.on("connect_error", (err) => {
  //   if (err.message === "Invalid auth") {
  //     wipeStorage();
  //     goto("/?message=gameerror");
  //   }
  // });

  // socket.on("disconnect", (reason) => {
  //   if (reason === "io server disconnect") {
  //     wipeStorage();
  //     goto("/?message=gameerror");
  //   }
  // });

  // socket.on("serverChat", (message) => {
  //   chatlog = [...chatlog, message];
  // });
  let screenWidth: number;
  $: wide = screenWidth > 700;
  let hideCode: boolean = true;
  let codeCopySuccess: boolean = false;
  let codeCopyError: boolean = false;
  let clientDares: DareWithTags[] = [];
  let players = new Map<string, Player>([
    [
      clientPlayerId,
      {
        playerId: clientPlayerId,
        playerName: clientPlayerName,
        ready: false,
        dares: clientDares.map((dare) => {
          return {
            dareId: dare.dareId,
            dareText: dare.dareText,
            partnered: dare.partnered,
            timer: dare.timer,
          };
        }),
      },
    ],
  ]);
  let host: string = "";
  let gameLog: string[] = [];
  let currentGameActivity: string = "Waiting for players to choose dares.";
  let currentDare: GameDare;
</script>

<svelte:window bind:innerWidth={screenWidth} />
<svelte:head>
  <title>Game {$page.params.code}</title>
</svelte:head>

<header class="page-header">
  <div>
    <strong>Game Code: {hideCode ? "****" : $page.params.code}</strong>
    <Button
      on:click={() => {
        hideCode = !hideCode;
      }}>{hideCode ? "Show" : "Hide"}</Button
    >
    <Button
      on:click={async () => {
        try {
          const copied = await navigator.clipboard.writeText($page.params.code);
          codeCopySuccess = true;
        } catch (error) {
          console.error(error);
          codeCopyError = true;
        }
        setTimeout(() => {
          codeCopyError = false;
          codeCopySuccess = false;
        }, 3000);
      }}
      className={codeCopySuccess ? "success" : codeCopyError ? "error" : ""}
      >Copy</Button
    >
  </div>
  <h1 class="logo-font">Dares</h1>
  <Button
    on:click={() => {
      // socket.disconnect();
      wipeStorage();
      goto("/");
    }}>Leave Game</Button
  >
</header>
<main>
  <section class="players">
    <header>
      <h2>Players</h2>
    </header>
    <ul>
      {#each [...players.values()] as player (player.playerId)}
        <li>
          <div>{player.playerName}</div>
          {#if player.playerId === host}
            <div>
              <small>HOST</small>
              {#if host === clientPlayerId}
                <Button>Host Actions</Button>
              {/if}
            </div>
          {:else if host === clientPlayerId}
            <Button>host action: kick</Button>
          {/if}
          <div>{player.ready ? "ready" : "waiting..."}</div>
        </li>
      {:else}
        <p>Connecting...</p>
      {/each}
    </ul>
  </section>
  <section class="gamelog">
    <header>
      <h2>Game Log</h2>
    </header>
    <ul>
      {#each gameLog as entry}
        <li>{entry}</li>
      {/each}
    </ul>
    {#if wide}
      <div class="current-activity" />
    {/if}
  </section>
  <section class="dares">
    <header>
      <h2>Your Dares</h2>
      <Button>Manage Dares</Button>
    </header>
    <ul class="client-dares">
      {#each clientDares as dare (dare.dareId)}
        <li><strong>{dare.dareText}</strong></li>
      {:else}
        <p class="alert">Please choose at least 2 solo dares.</p>
      {/each}
    </ul>
  </section>
  <section class="chat">
    <header>
      <h2>Player Chat</h2>
    </header>
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
  </section>
  {#if !wide}
    <div class="current-activity" />
    <footer>
      <ul>
        <li><button>Players</button></li>
        <li><button>Game Log</button></li>
        <li><button>Dares</button></li>
        <li><button>Chat</button></li>
      </ul>
    </footer>
  {/if}
</main>
