<script lang="ts">
  import { type Socket, io } from "socket.io-client";
  import {
    type ServerToClientEvents,
    type ClientToServerEvents,
    type Player,
    type DarerTurnStage,
    darerTurnStages,
    dareeTurnStages,
    mobileTabs,
  } from "$lib/game.types";
  import type { DareeTurnStage, MobileTab, ServerChat } from "$lib/game.types";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Button from "$lib/Button.svelte";
  import { page } from "$app/stores";
  import type { DareWithTags, GameDare } from "$lib/db.types";
  import { i } from "vitest/dist/index-5aad25c1";

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
  let gameLog: { text: string; dareText?: string }[] = [];
  let currentGameActivity: string = "Waiting for players to choose dares.";
  let currentDare: GameDare;
  let showCurrentDare: boolean = false;
  let darerTurnStage: DarerTurnStage = darerTurnStages.SPIN;
  let dareeTurnStage: DareeTurnStage = dareeTurnStages.CONFIRM;
  let activeTab: MobileTab = mobileTabs.PLAYERS;
  let newChat: boolean = false;
</script>

<svelte:window bind:innerWidth={screenWidth} />
<svelte:head>
  <title>Game {$page.params.code}</title>
</svelte:head>

<div class="body">
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
            const copied = await navigator.clipboard.writeText(
              $page.params.code
            );
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
    {#if wide}
      <h1 class="logo-font">Dare Me</h1>
    {/if}
    <Button
      on:click={() => {
        // socket.disconnect();
        wipeStorage();
        goto("/");
      }}>Leave Game</Button
    >
  </header>
  <main>
    <section
      id="players-tabpanel"
      class="players"
      class:inactive={activeTab !== mobileTabs.PLAYERS}
      role={!wide ? "tabpanel" : undefined}
      aria-labelledby={!wide ? "players-tab" : undefined}
    >
      {#if wide}
        <header>
          <h2>Players</h2>
        </header>
      {/if}
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
            {#if player.playerId === darer}
              <p><strong>DARER</strong></p>
            {:else if player.playerId === daree}
              <p><strong>DAREE</strong></p>
            {:else}
              <div>{player.ready ? "ready" : "waiting..."}</div>
            {/if}
          </li>
        {:else}
          <p>Connecting...</p>
        {/each}
      </ul>
    </section>
    <section
      id="gamelog-tabpanel"
      class="gamelog"
      class:inactive={activeTab !== mobileTabs.GAME_LOG}
      role={!wide ? "tabpanel" : undefined}
      aria-labelledby={!wide ? "gamelog-tab" : undefined}
    >
      {#if wide}
        <header>
          <h2>Game Log</h2>
        </header>
      {/if}
      <ul>
        {#each gameLog as { text, dareText }}
          <li>
            <p>{text}</p>
            {#if dareText}
              <p>{dareText}</p>
            {/if}
          </li>
        {/each}
      </ul>
      <div>
        {#if wide}
          <div class="current-activity" role="status">
            <p>{currentGameActivity}</p>
            {#if showCurrentDare}
              <p>{currentDare.dareText}</p>
              <!-- {#if currentDare.timer}
              TODO build timer
            {/if} -->
            {/if}
          </div>
        {/if}
      </div>
    </section>
    <section
      id="dares-tabpanel"
      class="dares"
      class:inactive={activeTab !== mobileTabs.DARES}
      role={!wide ? "tabpanel" : undefined}
      aria-labelledby={!wide ? "dares-tab" : undefined}
    >
      <header>
        {#if wide}
          <h2>Your Dares</h2>
        {/if}
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
    <section
      id="chat-tabpanel"
      class="chat"
      class:inactive={activeTab !== mobileTabs.CHAT}
      role={!wide ? "tabpanel" : undefined}
      aria-labelledby={!wide ? "chat-tab" : undefined}
    >
      {#if wide}
        <header>
          <h2>Player Chat</h2>
        </header>
      {/if}
      <ul class="chatlog" role="log">
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
    {#if !wide && !(activeTab === mobileTabs.GAME_LOG && (clientPlayerId === darer || clientPlayerId === daree))}
      <div class="current-activity" role="status">
        <p>{currentGameActivity}</p>
        {#if showCurrentDare}
          <p>{currentDare.dareText}</p>
          <!-- {#if currentDare.timer}
            TODO: build timer
          {/if} -->
        {/if}
      </div>
    {/if}
  </main>
  {#if !wide}
    <footer>
      <!-- TODO: implement correct keyboard nav as per Aria -->
      <ul role="tablist">
        <li
          id="players-tab"
          aria-selected={activeTab === mobileTabs.PLAYERS}
          role="tab"
          aria-controls="players-tabpanel"
        >
          <button
            on:click={() => {
              activeTab = mobileTabs.PLAYERS;
            }}>Players</button
          >
        </li>
        <li
          id="gamelog-tab"
          aria-selected={activeTab === mobileTabs.GAME_LOG}
          role="tab"
          aria-controls="gamelog-tabpanel"
        >
          <button
            on:click={() => {
              activeTab = mobileTabs.GAME_LOG;
            }}>Game Log</button
          >
        </li>
        <li
          id="dares-tab"
          aria-selected={activeTab === mobileTabs.DARES}
          role="tab"
          aria-controls="dares-tabpanel"
        >
          <button
            on:click={() => {
              activeTab = mobileTabs.DARES;
            }}>Dares</button
          >
        </li>
        <li
          id="chat-tab"
          aria-selected={activeTab === mobileTabs.CHAT}
          role="tab"
          aria-controls="chat-tabpanel"
        >
          <button
            on:click={() => {
              activeTab = mobileTabs.CHAT;
              newChat = false;
            }}
            >Chat <div
              class="newChat"
              class:inactive={!newChat}
              aria-label="new chat message"
            /></button
          >
        </li>
      </ul>
    </footer>
  {/if}
</div>

<style>
  .body {
    height: 100dvh;
    display: grid;
    grid-template-rows: auto 1fr auto;
  }

  .page-header {
    grid-row: 1/2;
    display: flex;
    justify-content: space-between;
    &:last-child {
      margin-inline-start: auto;
    }
  }

  main {
    grid-row: 2/3;
  }

  footer {
    grid-row: 3/4;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }

  .inactive {
    display: none;
  }

  #chat-tab {
    position: relative;
  }

  .newChat {
    position: absolute;
    top: 1rem;
    right: 1rem;
    width: 0.25rem;
    aspect-ratio: 1;
    border-radius: 50%;
    background-color: var(--accent-color);
  }
</style>
