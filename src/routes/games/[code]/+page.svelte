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
  import { goto, invalidateAll } from "$app/navigation";
  import {
    afterUpdate,
    beforeUpdate,
    getContext,
    onMount,
    setContext,
  } from "svelte";
  import Button from "$lib/Button.svelte";
  import { page } from "$app/stores";
  import {
    DareDbInputSchema,
    DareWithChildrenSchema,
    type DareWithChildren,
    type DareWithTags,
    type GameDare,
    DARE_STATUS,
    type NewDareState,
    type StatefulDare,
  } from "$lib/db.types";
  import Modal from "$lib/Modal.svelte";
  import DareListFilter from "$lib/DareListFilter.svelte";
  import Dare from "$lib/Dare.svelte";
  import { nanoid } from "nanoid";
  import { fade, slide } from "svelte/transition";
  import NewDare, { getAllNewDares } from "$lib/NewDare.svelte";
  import { writable, type Writable } from "svelte/store";
  import DisplayDare from "$lib/DisplayDare.svelte";
  import CaretDown from "phosphor-svelte/lib/CaretDown";
  import CaretUp from "phosphor-svelte/lib/CaretUp";
  import Eye from "phosphor-svelte/lib/Eye";
  import EyeSlash from "phosphor-svelte/lib/EyeSlash";
  import Clipboard from "phosphor-svelte/lib/Clipboard";
  import PencilSimpleLine from "phosphor-svelte/lib/PencilSimpleLine";
  import Plus from "phosphor-svelte/lib/Plus";
  import { response } from "express";

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
      socket.off();
    };
  });

  let chatlog: ServerChat[] = [];
  let pendingChats: string[] = [];

  let outgoingChat: string = "";

  let darer: string = "";

  let daree: string = "";

  export let data;
  // export let form;
  // const admin = getContext<Writable<boolean>>("admin");
  // const loggedIn = getContext<Writable<boolean>>("admin");
  // TODO: Update when Auth
  const loggedIn = false;
  let screenWidth: number;
  $: wide = !screenWidth ? false : screenWidth >= 1000;
  let hideCode: boolean = true;
  let codeCopySuccess: boolean = false;
  let codeCopyError: boolean = false;
  let clientSoloDares: DareWithChildren[] = [];
  let clientPartneredDares: DareWithChildren[] = [];
  let players: Map<string, Player>;
  let host: string = "";
  $: clientIsDarer = clientPlayerId === darer;
  $: clientIsDaree = clientPlayerId === daree;
  let gameLog: { text: string; dareText?: string }[] = [];
  let currentGameActivity: string = "Waiting for players to choose dares.";
  let currentDare: GameDare;
  let showCurrentDare: boolean = false;
  let recordInGameLog: boolean = false;
  let darerTurnStage: DarerTurnStage = darerTurnStages.SPIN;
  let spinning: boolean = false;
  let dareeDares: GameDare[] = [];
  let promptKeep: boolean = false;
  let clientPreviousDare: GameDare | null = null;
  $: dareeSoloDares = dareeDares.filter(({ partnered }) => !partnered);
  $: dareePartneredDares = dareeDares.filter(({ partnered }) => partnered);
  let darerPartneredDares: GameDare[] = [];
  let dareeTurnStage: DareeTurnStage = dareeTurnStages.CHOSEN;
  let activeTab: MobileTab = mobileTabs.PLAYERS;
  let newChat: boolean = false;
  let expandHeader = false;
  let socketServerError: string = "";

  let gamelogScroll: HTMLUListElement;
  let chatlogScroll: HTMLUListElement;
  let gamelogAutoscroll = false;
  let chatlogAutoscroll = false;
  let gamelogSavedScrollableDist = 0;
  let gamelogSavedScrollTop = 0;
  let chatlogSavedScrollableDist = 0;
  let chatlogSavedScrollTop = 0;

  beforeUpdate(() => {
    if (gamelogScroll) {
      const scrollableDistance =
        gamelogScroll.offsetHeight === 0
          ? gamelogSavedScrollableDist
          : gamelogScroll.scrollHeight - gamelogScroll.offsetHeight;
      const scrollTop =
        gamelogScroll.offsetHeight === 0
          ? gamelogSavedScrollTop
          : gamelogScroll.scrollTop;
      gamelogAutoscroll = scrollTop > scrollableDistance - 35;
      gamelogSavedScrollableDist = scrollableDistance;
      gamelogSavedScrollTop = scrollTop;
    }
    if (chatlogScroll) {
      const scrollableDistance =
        chatlogScroll.offsetHeight === 0
          ? chatlogSavedScrollableDist
          : chatlogScroll.scrollHeight - chatlogScroll.offsetHeight;
      const scrollTop =
        chatlogScroll.offsetHeight === 0
          ? chatlogSavedScrollTop
          : chatlogScroll.scrollTop;
      chatlogAutoscroll = scrollTop > scrollableDistance - 35;
      chatlogSavedScrollableDist = scrollableDistance;
      chatlogSavedScrollTop = scrollTop;
    }
  });

  afterUpdate(() => {
    console.log("after update autoscroll", gamelogAutoscroll);
    if (gamelogAutoscroll) {
      gamelogScroll.scrollTo(0, gamelogScroll.scrollHeight);
    } else {
      gamelogScroll.scrollTo(0, gamelogSavedScrollTop);
    }
    if (chatlogAutoscroll) {
      chatlogScroll.scrollTo(0, chatlogScroll.scrollHeight);
    } else {
      chatlogScroll.scrollTo(0, chatlogSavedScrollTop);
    }
  });

  function updateGameLog() {
    if (recordInGameLog) {
      gameLog = [
        ...gameLog,
        {
          text: currentGameActivity,
          dareText: showCurrentDare ? currentDare.dareText : undefined,
        },
      ];
    }
    recordInGameLog = false;
  }

  function sendChat() {
    pendingChats = [...pendingChats, outgoingChat];
    socket.emit("chat", outgoingChat);
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

  socket.on("serverError", () => {
    document.location.reload();
  });

  socket.on("connect", () => {
    if (!socket.recovered || !players || !host) {
      socket.timeout(5000).emit("requestSync", (err, state) => {
        if (err) {
          goto("/?message=gameerror");
          return;
        }
        if (state.darer) {
          updateGameLog();
          currentGameActivity = `It is ${state.darer}'s turn${
            state.daree ? " to dare " + state.daree : ""
          }.`;
          recordInGameLog = true;
        }
        if (state.currentDare) {
          currentDare = state.currentDare;
          showCurrentDare = true;
        }
        host = state.hostId;
        darer = state.darer ?? "";
        daree = state.daree ?? "";
        players = new Map(state.players);
      });
    }
    if (clientPartneredDares.length || clientSoloDares.length) {
      const gameDares = [...clientSoloDares, ...clientPartneredDares].map(
        (dare) => {
          return {
            dareId: dare.dareId,
            dareText: dare.dareText,
            partnered: dare.partnered,
            timer: dare.timer,
          };
        }
      );
      socket.emit("updateDares", gameDares);
    } else {
      socket.emit("checkDisco", async (response) => {
        if (!response.wasDisco || !response.savedDareIds?.length) {
          daresModal.showModal();
          return;
        }
        const searchParams = new URLSearchParams();
        response.savedDareIds.forEach((id) => {
          searchParams.append("id", id);
        });
        const dbDares = await fetch(`/api/dares?${searchParams.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        });
        const parsedDares = DareWithChildrenSchema.array().safeParse(dbDares);
        if (!parsedDares.success || !parsedDares.data.length) {
          daresModal.showModal();
          return;
        }
        clientPartneredDares = parsedDares.data.filter(
          ({ partnered }) => partnered
        );
        clientSoloDares = parsedDares.data.filter(
          ({ partnered }) => !partnered
        );
      });
    }
  });

  socket.on("playerReadinessUpdate", (player) => {
    const playerToUpdate = players.get(player.playerId);
    if (!playerToUpdate) {
      socket.timeout(5000).emit("requestSync", (err, state) => {
        if (err) {
          goto("/?message=gameerror");
          return;
        }
        if (state.darer && state.darer !== darer) {
          updateGameLog();
          currentGameActivity = `It is ${state.darer}'s turn${
            state.daree ? " to dare " + state.daree : ""
          }.`;
          recordInGameLog = true;
        }
        if (
          state.currentDare &&
          state.currentDare?.dareId !== currentDare.dareId
        ) {
          currentDare = state.currentDare;
          showCurrentDare = true;
        }
        host = state.hostId;
        darer = state.darer ?? "";
        daree = state.daree ?? "";
        players = new Map(state.players);
        const playerToNowUpdate = players.get(player.playerId);
        if (!playerToNowUpdate) {
          document.location.reload();
          return;
        }

        players.set(player.playerId, {
          ...playerToNowUpdate,
          ready: player.ready,
        });
        players = players;
      });
      return;
    }
    players.set(player.playerId, { ...playerToUpdate, ready: player.ready });
    players = players;
  });

  socket.on("newPlayerJoined", (player) => {
    players.set(player.playerId, player);
    players = players;
    gameLog = [...gameLog, { text: `${player.playerName} joined the game!` }];
  });

  socket.on("playerDisconnected", (player) => {
    gameLog = [
      ...gameLog,
      {
        text: `${
          players.get(player)?.playerName
        } was disconnected from the game.`,
      },
    ];
    players.delete(player);
    players = players;
  });
  socket.on("playerLeft", (player) => {
    gameLog = [
      ...gameLog,
      {
        text: `${players.get(player)?.playerName} left the game.`,
      },
    ];
    players.delete(player);
    players = players;
  });
  socket.on("playerKicked", (player) => {
    gameLog = [
      ...gameLog,
      {
        text: `${players.get(player)?.playerName} was kicked from the game.`,
      },
    ];
    players.delete(player);
    players = players;
  });

  socket.on("spinning", () => {
    updateGameLog();
    currentGameActivity = `${players.get(darer)?.playerName} is spinning.`;
    showCurrentDare = false;
  });

  socket.on("dareeSelected", (newDaree) => {
    spinning = false;
    if ("error" in newDaree) {
      socketServerError = newDaree.error;
      return;
    }
    daree = newDaree.dareeId;
    dareeDares = newDaree.dareeDares;
    updateGameLog();
    currentGameActivity = `${players.get(darer)?.playerName} has landed on ${
      players.get(newDaree.dareeId)?.playerName
    }!`;
    showCurrentDare = false;
    if (clientPlayerId === newDaree.dareeId && daresModal.open) {
      interruptModal.showModal();
    }
    setTimeout(() => {
      if (clientIsDarer) {
        darerTurnStage = darerTurnStages.SELECT;
      }
      updateGameLog();
      currentGameActivity = `${
        players.get(darer)?.playerName
      } is selecting a dare for ${players.get(newDaree.dareeId)?.playerName}.`;
      showCurrentDare = false;
    }, 1000);
  });

  socket.on("serverChat", (message) => {
    if (pendingChats.length) {
      if (message.playerId !== clientPlayerId) {
        pendingChats = [];
      } else {
        const index = pendingChats.indexOf(message.message);
        pendingChats = pendingChats.toSpliced(0, index + 1);
      }
    }
    chatlog = [...chatlog, message];
    if (activeTab !== mobileTabs.CHAT && message.playerId !== clientPlayerId) {
      newChat = true;
    }
  });

  let daresModal: HTMLDialogElement;
  let interruptModal: HTMLDialogElement;
  let interrupted: boolean = false;
  let soloDaresToSave: DareWithChildren[] = [];
  let partneredDaresToSave: DareWithChildren[] = [];
  $: totalDaresToSave = soloDaresToSave.length + partneredDaresToSave.length;
  let saveToPublic: boolean = true;
  let randomDare: DareWithChildren | null = null;
  let savedAllSuccess: boolean = false;
  const filteredTags = writable<string[]>([]);
  setContext("filteredTags", filteredTags);
  const filteredDares = writable<StatefulDare[]>([]);
  setContext("filteredDares", filteredDares);
  const selectedParentIds = writable<string[]>([]);
  setContext("selectedParentIds", selectedParentIds);
  const allSelectedVariantIds = writable<string[]>([]);
  setContext("allSelectedVariantIds", allSelectedVariantIds);

  let daresToAdd: (NewDareState & {
    parentDare?: DareWithChildren;
    replaceParent?: boolean;
  })[] = [];
  let markNewIds: string[] = [];
  let GameNewDareIds: string[] = [];

  $: dares = [...data.dares];

  let saveAllError: string = "";
  let savingAll: boolean = false;

  let filtered: boolean;
</script>

<svelte:window bind:innerWidth={screenWidth} />

<svelte:head>
  <title>Game {$page.params.code}</title>
</svelte:head>

<div class="body">
  <header class="page-header" class:expanded={!wide && expandHeader}>
    {#if !wide && !expandHeader}
      <h1 class="logo-font">Dare Me</h1>
      <Button
        className="icon-only"
        on:click={() => {
          expandHeader = true;
        }}
      >
        <CaretDown />
      </Button>
    {:else}
      <div class="game-code">
        <strong>Game Code: {hideCode ? "****" : $page.params.code}</strong>
        <Button
          className={screenWidth > 600 ? "with-icon" : "icon-only"}
          on:click={() => {
            hideCode = !hideCode;
          }}
        >
          {#if hideCode}
            {screenWidth > 600 ? "Show" : ""}
            <Eye />
          {:else}
            {screenWidth > 600 ? "Hide" : ""}
            <EyeSlash />
          {/if}
        </Button>
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
          className={`${screenWidth > 600 ? "with-icon" : "icon-only"} ${
            codeCopySuccess ? "success" : codeCopyError ? "error" : ""
          }`}
        >
          {screenWidth > 600 ? "Copy" : ""}
          <Clipboard />
        </Button>
      </div>
      {#if wide}
        <h1 class="logo-font">Dare Me</h1>
      {/if}
      <Button
        on:click={() => {
          socket.disconnect();
          wipeStorage();
          goto("/");
        }}>Leave Game</Button
      >
      {#if !wide}
        <Button
          className="icon-only"
          on:click={() => {
            expandHeader = false;
          }}
        >
          <CaretUp />
        </Button>
      {/if}
    {/if}
  </header>
  <div class="main-container">
    <main>
      {#if !wide && !(activeTab === mobileTabs.GAME_LOG)}
        <div class="current-activity mobile-status" role="status">
          <p>{currentGameActivity}</p>
          {#if showCurrentDare}
            <p>{currentDare.dareText}</p>
            <!-- {#if currentDare.timer}
            TODO: build timer
          {/if} -->
          {/if}
        </div>
      {/if}
      <section
        id="players-tabpanel"
        class="players"
        class:inactive={!wide && activeTab !== mobileTabs.PLAYERS}
        role={!wide ? "tabpanel" : undefined}
        aria-labelledby={!wide ? "players-tab" : undefined}
      >
        {#if wide}
          <header>
            <h2>Players</h2>
          </header>
        {/if}
        <div class="players-list-container">
          <ul class="players-list">
            {#each [...players.values()] as player (player.playerId)}
              <li
                class:darer={player.playerId === darer}
                class:daree={player.playerId === daree}
              >
                <div><strong>{player.playerName}</strong></div>
                {#if player.playerId === host}
                  <div>
                    <small>HOST</small>
                    <!-- {#if host === clientPlayerId}
                    <Button>Host Actions</Button>
                  {/if} -->
                  </div>
                {:else if host === clientPlayerId}
                  <div class="host-player-buttons">
                    <Button>Make Host</Button>
                    <!-- <Button>Kick</Button> -->
                  </div>
                {/if}
                {#if player.playerId === darer}
                  <p>DARER</p>
                {:else if player.playerId === daree}
                  <p><strong>DAREE</strong></p>
                {:else}
                  <div>{player.ready ? "ready" : "choosing dares..."}</div>
                {/if}
              </li>
            {:else}
              <p>Connecting...</p>
            {/each}
          </ul>
        </div>
      </section>
      <section
        id="gamelog-tabpanel"
        class="gamelog"
        class:inactive={!wide && activeTab !== mobileTabs.GAME_LOG}
        role={!wide ? "tabpanel" : undefined}
        aria-labelledby={!wide ? "gamelog-tab" : undefined}
      >
        <div class="gamelog-scroll">
          {#if wide}
            <header>
              <h2>Game Log</h2>
            </header>
          {/if}
          <div class="gamelog-list-container">
            <ul class="gamelog-list" bind:this={gamelogScroll}>
              {#each gameLog as { text, dareText }}
                <li>
                  <p>{text}</p>
                  {#if dareText}
                    <p>{dareText}</p>
                  {/if}
                </li>
              {/each}
            </ul>
          </div>
          <div class="activity">
            {#if clientIsDarer && darerTurnStage === darerTurnStages.SPIN}
              <div>
                <p>It's your turn to select a dare for someone!</p>
                <p>Spin to find out who you'll be daring:</p>
              </div>
              {#if spinning}
                <!-- TODO: animation -->
                <p class="center">Spinning...</p>
              {:else if daree}
                <p class="daree center">
                  <strong>{players.get(daree)?.playerName}!</strong>
                </p>
              {:else}
                <Button
                  className="inverted center"
                  on:click={() => {
                    socketServerError = "";
                    spinning = true;
                    socket.emit("spin");
                  }}>Spin</Button
                >
                {#if socketServerError}
                  <p>socketServerError</p>
                {/if}
              {/if}
            {:else if clientIsDarer && darerTurnStage === darerTurnStages.SELECT}
              <div>
                <p>
                  Choose a Dare for {players.get(daree)?.playerName} to preform.
                </p>
                <p>
                  <small
                    >If you choose a <strong>Partnered</strong> dare, {players.get(
                      daree
                    )?.playerName} will have the opportunity to decline and either
                    ask you to choose a <strong>Solo</strong> dare, or counteroffer.</small
                  >
                </p>
              </div>
              {#if socketServerError}
                <p>socketServerError</p>
              {/if}
              {#if dareePartneredDares.length}
                <h3>{players.get(daree)?.playerName}'s Partnered Dares</h3>
                <ul>
                  {#each dareePartneredDares as dare (dare.dareId)}
                    <li>
                      <DisplayDare {dare}
                        ><svelte:fragment slot="buttons">
                          <Button
                            className="inverted"
                            on:click={() => {
                              socketServerError = "";
                            }}>Select</Button
                          >
                        </svelte:fragment></DisplayDare
                      >
                    </li>
                  {/each}
                </ul>
              {/if}
              <h3>{players.get(daree)?.playerName}'s Solo Dares</h3>
              <ul>
                {#each dareeSoloDares as dare (dare.dareId)}
                  <li>
                    <DisplayDare {dare}
                      ><svelte:fragment slot="buttons">
                        <Button className="inverted">Select</Button>
                      </svelte:fragment></DisplayDare
                    >
                  </li>
                {/each}
              </ul>
            {:else if clientIsDarer && darerTurnStage === darerTurnStages.SENT}
              <p>
                {players.get(daree)?.playerName} is considering the dare you selected:
              </p>
              <DisplayDare dare={currentDare} />
            {:else if clientIsDarer && darerTurnStage === darerTurnStages.ACCEPTED}
              <p>
                {players.get(daree)?.playerName} agreed to the dare you selected!
              </p>
              <DisplayDare dare={currentDare} />
            {:else if clientIsDarer && darerTurnStage === darerTurnStages.DECLINED}
              <p>
                {players.get(daree)?.playerName} declined the dare you selected.
                Please choose one of their <strong>Solo</strong> dares:
              </p>
              <h3>{players.get(daree)?.playerName}'s Solo Dares</h3>
              <ul>
                {#each dareeSoloDares as dare (dare.dareId)}
                  <li>
                    <DisplayDare {dare}
                      ><svelte:fragment slot="buttons">
                        <Button className="inverted">Select</Button>
                      </svelte:fragment></DisplayDare
                    >
                  </li>
                {/each}
              </ul>
            {:else if clientIsDarer && darerTurnStage === darerTurnStages.COUNTERED}
              <p>
                {players.get(daree)?.playerName} declined the dare you selected,
                but offered to perform this dare instead:
              </p>
              <DisplayDare dare={currentDare} />
              <Button className="inverted start">Accept the Counteroffer</Button
              >
              <p>
                Or choose one of {players.get(daree)?.playerName}'s
                <strong>Solo</strong> dares:
              </p>
              <h3>{players.get(daree)?.playerName}'s Solo Dares</h3>
              <ul>
                {#each dareeSoloDares as dare (dare.dareId)}
                  <li>
                    <DisplayDare {dare}
                      ><svelte:fragment slot="buttons">
                        <Button className="inverted">Select</Button>
                      </svelte:fragment></DisplayDare
                    >
                  </li>
                {/each}
              </ul>
            {:else if clientIsDarer && darerTurnStage === darerTurnStages.END}
              <p>You dared {players.get(daree)?.playerName} to:</p>
              <DisplayDare dare={currentDare} />
              <!-- {#if currentDare.timer}
                TODO build timer
              {/if}  -->
              <Button
                className="inverted center"
                on:click={() => {
                  if (promptKeep) {
                    clientPreviousDare = currentDare;
                    darerTurnStage = darerTurnStages.KEEP_DARE;
                    promptKeep = false;
                  } else {
                    darerTurnStage = darerTurnStages.SPIN;
                  }
                  daree = "";
                  darer = "";
                }}>End Your Turn</Button
              >
            {:else if darerTurnStage === darerTurnStages.KEEP_DARE && clientPreviousDare}
              <p>Would you like to keep this dare in your dare list?</p>
              <DisplayDare dare={clientPreviousDare} />
              <div class="keep-buttons center">
                <Button
                  className="inverted"
                  on:click={() => {
                    darerTurnStage = darerTurnStages.SPIN;
                  }}>Keep Dare</Button
                >
                {#if (clientPreviousDare.partnered && clientSoloDares.length + clientPartneredDares.length > 2) || (!clientPreviousDare.partnered && clientSoloDares.length >= 2 && clientSoloDares.length + clientPartneredDares.length > 2)}
                  <Button
                    className="inverted"
                    on:click={() => {
                      if (clientPreviousDare?.partnered) {
                        clientPartneredDares = clientPartneredDares.filter(
                          ({ dareId }) => dareId !== clientPreviousDare?.dareId
                        );
                      } else {
                        clientSoloDares = clientSoloDares.filter(
                          ({ dareId }) => dareId !== clientPreviousDare?.dareId
                        );
                      }
                      darerTurnStage = darerTurnStages.SPIN;
                    }}>Remove Dare</Button
                  >
                {/if}
                <Button
                  className="inverted"
                  on:click={() => {
                    if (clientPreviousDare?.partnered) {
                      clientPartneredDares = clientPartneredDares.filter(
                        ({ dareId }) => dareId !== clientPreviousDare?.dareId
                      );
                    } else {
                      clientSoloDares = clientSoloDares.filter(
                        ({ dareId }) => dareId !== clientPreviousDare?.dareId
                      );
                    }
                    activeTab = mobileTabs.DARES;
                    darerTurnStage = darerTurnStages.SPIN;
                    if (!interrupted) {
                      soloDaresToSave = [...clientSoloDares];
                      partneredDaresToSave = [...clientPartneredDares];
                    }
                    interrupted = false;
                    daresModal.showModal();
                  }}>Replace Dare</Button
                >
              </div>
            {:else if clientIsDaree && dareeTurnStage === dareeTurnStages.CHOSEN}
              <p>{players.get(darer)?.playerName} landed on you!</p>
              <p>
                {players.get(darer)?.playerName} is selecting a dare for you.
              </p>
            {:else if clientIsDaree && dareeTurnStage === dareeTurnStages.CONFIRM}
              <p>
                {players.get(darer)?.playerName} has dared you to:
              </p>
              <DisplayDare dare={currentDare} />
              <p>How do you want to respond?</p>
              <Button
                className="inverted start"
                on:click={() => {
                  socketServerError = "";
                  socket
                    .timeout(5000)
                    .emit(
                      "dareeResponse",
                      { response: "accept" },
                      (err, ack) => {
                        if (err || ack !== "accepted") {
                          socketServerError =
                            "Something went wrong, please try again";
                          return;
                        }
                        dareeTurnStage = dareeTurnStages.END;
                      }
                    );
                }}>Accept Dare</Button
              >

              <p>
                <Button
                  className="inverted"
                  on:click={() => {
                    socketServerError = "";
                    socket
                      .timeout(5000)
                      .emit(
                        "dareeResponse",
                        { response: "decline" },
                        (err, ack) => {
                          if (err || ack !== "declined") {
                            socketServerError =
                              "Something went wrong, please try again";
                            return;
                          }
                          dareeTurnStage = dareeTurnStages.DECLINED;
                        }
                      );
                  }}>Decline Dare</Button
                > and have {players.get(darer)?.playerName}
                choose one of your <strong>Solo</strong> dares.
              </p>
              {#if socketServerError}
                <p>socketServerError</p>
              {/if}
              {#if darerPartneredDares.length}
                <div>
                  <p>
                    Or <strong>Counteroffer</strong>, by selecting a different
                    dare from either of your <strong>Partnered</strong> dares:
                  </p>
                  <p>
                    <small
                      >{players.get(darer)?.playerName} will have the opportunity
                      to decline and choose one of your <strong>Solo</strong> dares
                      instead.</small
                    >
                  </p>
                </div>
                <h3>{players.get(darer)?.playerName}'s Partnered Dares</h3>
                <ul>
                  {#each darerPartneredDares as dare (dare.dareId)}
                    <li>
                      <DisplayDare {dare}
                        ><svelte:fragment slot="buttons">
                          <Button
                            className="inverted"
                            on:click={() => {
                              socketServerError = "";
                              socket.timeout(5000).emit(
                                "dareeResponse",
                                {
                                  response: "counter",
                                  dareOwner: "darer",
                                  counter: dare,
                                },
                                (err, ack) => {
                                  if (err || ack !== "countered") {
                                    socketServerError =
                                      "Something went wrong, please try again";
                                    return;
                                  }
                                  dareeTurnStage = dareeTurnStages.COUNTERED;
                                }
                              );
                            }}>Select</Button
                          >
                        </svelte:fragment></DisplayDare
                      >
                    </li>
                  {/each}
                </ul>
              {/if}
              {#if dareePartneredDares.length}
                <h3>Your Partnered Dares</h3>
                <ul>
                  {#each dareePartneredDares as dare (dare.dareId)}
                    <li>
                      <DisplayDare {dare}
                        ><svelte:fragment slot="buttons">
                          <Button
                            className="inverted"
                            on:click={() => {
                              socketServerError = "";
                              socket.timeout(5000).emit(
                                "dareeResponse",
                                {
                                  response: "counter",
                                  dareOwner: "daree",
                                  counter: dare,
                                },
                                (err, ack) => {
                                  if (err || ack !== "countered") {
                                    socketServerError =
                                      "Something went wrong, please try again";
                                    return;
                                  }
                                  dareeTurnStage = dareeTurnStages.COUNTERED;
                                }
                              );
                            }}>Select</Button
                          >
                        </svelte:fragment></DisplayDare
                      >
                    </li>
                  {/each}
                </ul>
              {/if}
            {:else if clientIsDaree && dareeTurnStage === dareeTurnStages.DECLINED}
              <p>
                {players.get(darer)?.playerName} is choosing one of your
                <strong>Solo</strong> dares.
              </p>
            {:else if clientIsDaree && dareeTurnStage === dareeTurnStages.COUNTERED}
              <p>
                {players.get(darer)?.playerName} is considering your counteroffer.
              </p>
              <DisplayDare dare={currentDare} />
            {:else if clientIsDaree && dareeTurnStage === dareeTurnStages.COUNTER_ACCEPTED}
              <p>
                {players.get(darer)?.playerName} accepted your counteroffer!
              </p>
              <DisplayDare dare={currentDare} />
            {:else if clientIsDaree && dareeTurnStage === dareeTurnStages.COUNTER_DECLINED}
              <p>
                {players.get(daree)?.playerName} declined your counteroffer, and
                instead dares you to:
              </p>
              <DisplayDare dare={currentDare} />
            {:else if clientIsDaree && dareeTurnStage === dareeTurnStages.END}
              <p>{players.get(darer)?.playerName} dared you to:</p>
              <DisplayDare dare={currentDare} />
              <!-- {#if currentDare.timer}
              TODO build timer
            {/if}  -->
              <Button
                className="inverted center"
                on:click={() => {
                  if (promptKeep) {
                    clientPreviousDare = currentDare;
                    dareeTurnStage = dareeTurnStages.KEEP_DARE;
                    promptKeep = false;
                  } else {
                    dareeTurnStage = dareeTurnStages.CONFIRM;
                  }
                  daree = "";
                  darer = "";
                }}>End Your Turn</Button
              >
            {:else if dareeTurnStage === dareeTurnStages.KEEP_DARE && clientPreviousDare}
              <p>Would you like to keep this dare in your dare list?</p>
              <DisplayDare dare={clientPreviousDare} />
              <div class="keep-buttons center">
                <Button
                  className="inverted"
                  on:click={() => {
                    dareeTurnStage = dareeTurnStages.CONFIRM;
                  }}>Keep Dare</Button
                >
                {#if !(!clientPreviousDare.partnered && clientSoloDares.length <= 2)}
                  <Button
                    className="inverted"
                    on:click={() => {
                      if (clientPreviousDare?.partnered) {
                        clientPartneredDares = clientPartneredDares.filter(
                          ({ dareId }) => dareId !== clientPreviousDare?.dareId
                        );
                      } else {
                        clientSoloDares = clientSoloDares.filter(
                          ({ dareId }) => dareId !== clientPreviousDare?.dareId
                        );
                      }
                      dareeTurnStage = dareeTurnStages.CONFIRM;
                    }}>Remove Dare</Button
                  >
                {/if}
                <Button
                  className="inverted"
                  on:click={() => {
                    if (clientPreviousDare?.partnered) {
                      clientPartneredDares = clientPartneredDares.filter(
                        ({ dareId }) => dareId !== clientPreviousDare?.dareId
                      );
                    } else {
                      clientSoloDares = clientSoloDares.filter(
                        ({ dareId }) => dareId !== clientPreviousDare?.dareId
                      );
                    }
                    activeTab = mobileTabs.DARES;
                    dareeTurnStage = dareeTurnStages.CONFIRM;
                    if (!interrupted) {
                      soloDaresToSave = [...clientSoloDares];
                      partneredDaresToSave = [...clientPartneredDares];
                    }
                    interrupted = false;
                    daresModal.showModal();
                  }}>Replace Dare</Button
                >
              </div>
            {:else}
              <div class="current-activity" role="status">
                <p>{currentGameActivity}</p>
                {#if showCurrentDare}
                  {#if wide}
                    <DisplayDare dare={currentDare} />
                  {:else}
                    <p>{currentDare.dareText}</p>
                  {/if}
                  <!-- {#if currentDare.timer}
                TODO build timer
              {/if}  -->
                {/if}
              </div>
            {/if}
          </div>
        </div>
      </section>
      <section
        id="chat-tabpanel"
        class="chat"
        class:inactive={!wide && activeTab !== mobileTabs.CHAT}
        role={!wide ? "tabpanel" : undefined}
        aria-labelledby={!wide ? "chat-tab" : undefined}
      >
        {#if wide}
          <header>
            <h2>Player Chat</h2>
          </header>
        {/if}
        <div class="chatlog-container">
          <ul class="chatlog" role="log" bind:this={chatlogScroll}>
            {#each chatlog as chat}
              <li><strong>{chat.playerName}: </strong>{chat.message}</li>
            {/each}
            {#each pendingChats as chat}
              <li class="pending-chat">
                <strong>{clientPlayerName}: </strong>{chat}
              </li>
            {/each}
          </ul>
        </div>
        <div class="chat-box-container">
          <p
            contenteditable="true"
            aria-label="Chat box"
            class="chat-box"
            bind:textContent={outgoingChat}
            on:keydown={(e) => {
              if (e.key === "Enter") {
                sendChat();
              }
            }}
          />
        </div>
        <Button on:click={sendChat}>Send</Button>
      </section>
      <section
        id="dares-tabpanel"
        class="dares"
        class:inactive={!wide && activeTab !== mobileTabs.DARES}
        role={!wide ? "tabpanel" : undefined}
        aria-labelledby={!wide ? "dares-tab" : undefined}
      >
        <div class="dares-top">
          <header>
            {#if wide}
              <h2>Your Dares</h2>
            {/if}
            <Button
              on:click={() => {
                if (!interrupted) {
                  soloDaresToSave = [...clientSoloDares];
                  partneredDaresToSave = [...clientPartneredDares];
                }
                interrupted = false;
                daresModal.showModal();
              }}>{interrupted ? `Cont. ` : ""}Update Dares</Button
            >
          </header>
          {#if clientSoloDares.length + clientPartneredDares.length < 3}
            <p class="alert">
              Please choose at least 3 dares to be included in the next spin.
            </p>
          {/if}
        </div>
        <div class="dare-lists">
          <div class="dare-list">
            <h3>Solo</h3>
            <div class="client-dares-container">
              <ul class="client-dares">
                {#each clientSoloDares as dare (dare.dareId)}
                  <li>{dare.dareText}</li>
                {:else}
                  <p class="alert">
                    Please choose at least 2 solo dares to be included in the
                    next spin.
                  </p>
                {/each}
              </ul>
            </div>
          </div>
          <div class="dare-list">
            <h3>Partnered</h3>
            <div class="client-dares-container">
              <ul class="client-dares">
                {#each clientPartneredDares as dare (dare.dareId)}
                  <li>{dare.dareText}</li>
                {/each}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </main>
  </div>
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
            ><span
              >Chat <div
                class="newChat"
                class:inactive={!newChat}
                aria-label="new chat message"
              /></span
            ></button
          >
        </li>
      </ul>
    </footer>
  {/if}
</div>
<Modal
  bind:modal={daresModal}
  on:cancel={(e) => {
    const newDaresMap = getAllNewDares();
    if (
      newDaresMap.size ||
      soloDaresToSave.length !== clientSoloDares.length ||
      partneredDaresToSave.length !== clientPartneredDares.length ||
      !clientSoloDares.every((clientDare) =>
        soloDaresToSave.some((dare) => dare.dareId === clientDare.dareId)
      ) ||
      !soloDaresToSave.every((dare) =>
        clientSoloDares.some((clientDare) => dare.dareId === clientDare.dareId)
      ) ||
      !clientPartneredDares.every((clientDare) =>
        partneredDaresToSave.some((dare) => dare.dareId === clientDare.dareId)
      ) ||
      !partneredDaresToSave.every((dare) =>
        clientPartneredDares.some(
          (clientDare) => dare.dareId === clientDare.dareId
        )
      )
    ) {
      if (!window.confirm(`Discard all changes?`)) {
        e.preventDefault();
        return;
      }
    }
    daresToAdd = [];
    partneredDaresToSave = [];
    soloDaresToSave = [];
    markNewIds = [];
  }}
>
  <div class="dares-modal">
    <p>
      Choose 3-10 dares you want to do. You must always have at least 2 <strong
        >Solo</strong
      >
      dares. You should be prepared to do any of your <strong>Solo</strong> dares
      at any time. You can update your dares throughout the game.
    </p>
    <section class="db-dares">
      <h3>All Dares</h3>
      <div class="all-dares">
        <div class="scroll">
          <DareListFilter
            autofocusSearch
            bind:filtered
            {dares}
            showFilters={false}
          />
          <ul id="dare-list" class="dares-box">
            {#each $filteredDares as filteredDare (filteredDare.dare.dareId)}
              <li
                class={markNewIds.includes(filteredDare.dare.dareId)
                  ? "new"
                  : ""}
              >
                <Dare
                  dare={filteredDare.dare}
                  {loggedIn}
                  expand={filtered ||
                    filteredDare.dare.children.some((variant) =>
                      markNewIds.includes(variant.dareId)
                    )}
                  {markNewIds}
                  withDetails
                  withVariants
                >
                  <svelte:fragment slot="buttons">
                    <Button
                      className={wide ? "with-icon" : "icon-only"}
                      on:click={() => {
                        daresToAdd = [
                          ...daresToAdd,
                          {
                            saved: false,
                            saving: false,
                            removed: false,
                            errors: [],
                            dareToAddId: nanoid(),
                            parentDare: filteredDare.dare,
                            replaceParent: false,
                          },
                        ];
                      }}>{wide ? "Add New Variant" : ""}<Plus /></Button
                    >
                    <Button
                      on:click={() => {
                        if (
                          partneredDaresToSave.some(
                            ({ dareId }) => dareId === filteredDare.dare.dareId
                          )
                        ) {
                          partneredDaresToSave = partneredDaresToSave.filter(
                            ({ dareId }) => dareId !== filteredDare.dare.dareId
                          );
                          return;
                        }
                        if (
                          soloDaresToSave.some(
                            ({ dareId }) => dareId === filteredDare.dare.dareId
                          )
                        ) {
                          soloDaresToSave = soloDaresToSave.filter(
                            ({ dareId }) => dareId !== filteredDare.dare.dareId
                          );
                          return;
                        }
                        if (filteredDare.dare.partnered) {
                          partneredDaresToSave = [
                            ...partneredDaresToSave,
                            filteredDare.dare,
                          ];
                        } else {
                          soloDaresToSave = [
                            ...soloDaresToSave,
                            filteredDare.dare,
                          ];
                        }
                      }}
                      >{partneredDaresToSave.some(
                        ({ dareId }) => dareId === filteredDare.dare.dareId
                      ) ||
                      soloDaresToSave.some(
                        ({ dareId }) => dareId === filteredDare.dare.dareId
                      )
                        ? "Selected!"
                        : "Select"}</Button
                    >
                  </svelte:fragment>
                  <svelte:fragment slot="variant-buttons" let:variantId>
                    <Button
                      className={wide ? "with-icon" : "icon-only"}
                      on:click={() => {
                        const variant = filteredDare.dare.children.find(
                          (child) => child.dareId === variantId
                        );
                        if (!variant) {
                          return;
                        }
                        daresToAdd = [
                          ...daresToAdd,
                          {
                            saved: false,
                            saving: false,
                            removed: false,
                            errors: [],
                            dareToAddId: nanoid(),
                            parentDare: { ...variant, children: [] },
                            replaceParent: false,
                          },
                        ];
                      }}>{wide ? "Add New Variant" : ""}<Plus /></Button
                    >
                    <Button
                      on:click={() => {
                        if (
                          partneredDaresToSave.some(
                            ({ dareId }) => dareId === variantId
                          )
                        ) {
                          partneredDaresToSave = partneredDaresToSave.filter(
                            ({ dareId }) => dareId !== variantId
                          );
                          return;
                        }
                        if (
                          soloDaresToSave.some(
                            ({ dareId }) => dareId === variantId
                          )
                        ) {
                          soloDaresToSave = soloDaresToSave.filter(
                            ({ dareId }) => dareId !== variantId
                          );
                          return;
                        }
                        const dare = filteredDare.dare.children.find(
                          ({ dareId }) => dareId === variantId
                        );
                        if (dare) {
                          if (dare.partnered) {
                            partneredDaresToSave = [
                              ...partneredDaresToSave,
                              { ...dare, children: [] },
                            ];
                          } else {
                            soloDaresToSave = [
                              ...soloDaresToSave,
                              { ...dare, children: [] },
                            ];
                          }
                        }
                      }}
                      >{partneredDaresToSave.some(
                        ({ dareId }) => dareId === variantId
                      ) ||
                      soloDaresToSave.some(({ dareId }) => dareId === variantId)
                        ? "Selected!"
                        : "Select"}</Button
                    >
                  </svelte:fragment>
                </Dare>
              </li>
            {:else}
              <li>No Dares Found</li>
            {/each}
          </ul>
        </div>
      </div>
    </section>
    <section class="random-dare">
      <Button
        on:click={() => {
          const randomIndex = Math.floor(Math.random() * dares.length);
          randomDare = dares[randomIndex];
        }}>Find a Random Dare</Button
      >
      {#if randomDare}
        <div class="solo-dare">
          <Dare dare={randomDare} withDetails withVariants>
            <svelte:fragment slot="buttons">
              <Button
                className={wide ? "with-icon" : "icon-only"}
                on:click={() => {
                  if (!randomDare) {
                    return;
                  }
                  daresToAdd = [
                    ...daresToAdd,
                    {
                      saved: false,
                      saving: false,
                      removed: false,
                      errors: [],
                      dareToAddId: nanoid(),
                      parentDare: randomDare,
                      replaceParent: false,
                    },
                  ];
                }}>{wide ? "Add New Variant" : ""}<Plus /></Button
              >
              <Button
                on:click={() => {
                  if (!randomDare) {
                    return;
                  }
                  if (
                    partneredDaresToSave.some(
                      ({ dareId }) => dareId === randomDare?.dareId
                    )
                  ) {
                    partneredDaresToSave = partneredDaresToSave.filter(
                      ({ dareId }) => dareId !== randomDare?.dareId
                    );
                    return;
                  }
                  if (
                    soloDaresToSave.some(
                      ({ dareId }) => dareId === randomDare?.dareId
                    )
                  ) {
                    soloDaresToSave = soloDaresToSave.filter(
                      ({ dareId }) => dareId !== randomDare?.dareId
                    );
                    return;
                  }
                  if (randomDare.partnered) {
                    partneredDaresToSave = [
                      ...partneredDaresToSave,
                      randomDare,
                    ];
                  } else {
                    soloDaresToSave = [...soloDaresToSave, randomDare];
                  }
                }}
                >{partneredDaresToSave.some(
                  ({ dareId }) => dareId === randomDare?.dareId
                ) ||
                soloDaresToSave.some(
                  ({ dareId }) => dareId === randomDare?.dareId
                )
                  ? "Selected!"
                  : "Select"}</Button
              >
            </svelte:fragment>
            <svelte:fragment slot="variant-buttons" let:variantId>
              <Button
                className={wide ? "with-icon" : "icon-only"}
                on:click={() => {
                  const variant = randomDare?.children.find(
                    (child) => child.dareId === variantId
                  );
                  if (!variant) {
                    return;
                  }
                  daresToAdd = [
                    ...daresToAdd,
                    {
                      saved: false,
                      saving: false,
                      removed: false,
                      errors: [],
                      dareToAddId: nanoid(),
                      parentDare: { ...variant, children: [] },
                      replaceParent: false,
                    },
                  ];
                }}>{wide ? "Add New Variant" : ""}<Plus /></Button
              >
              <Button
                on:click={() => {
                  if (
                    partneredDaresToSave.some(
                      ({ dareId }) => dareId === variantId
                    )
                  ) {
                    partneredDaresToSave = partneredDaresToSave.filter(
                      ({ dareId }) => dareId !== variantId
                    );
                    return;
                  }
                  if (
                    soloDaresToSave.some(({ dareId }) => dareId === variantId)
                  ) {
                    soloDaresToSave = soloDaresToSave.filter(
                      ({ dareId }) => dareId !== variantId
                    );
                    return;
                  }
                  const dare = randomDare?.children.find(
                    ({ dareId }) => dareId === variantId
                  );
                  if (dare) {
                    if (dare.partnered) {
                      partneredDaresToSave = [
                        ...partneredDaresToSave,
                        { ...dare, children: [] },
                      ];
                    } else {
                      soloDaresToSave = [
                        ...soloDaresToSave,
                        { ...dare, children: [] },
                      ];
                    }
                  }
                }}
                >{partneredDaresToSave.some(
                  ({ dareId }) => dareId === variantId
                ) || soloDaresToSave.some(({ dareId }) => dareId === variantId)
                  ? "Selected!"
                  : "Select"}</Button
              >
            </svelte:fragment>
          </Dare>
        </div>
      {/if}
    </section>
    <section class="new-dares">
      {#if daresToAdd.length}
        <h3 transition:fade>New Dares</h3>
        <div class="new-dares-wrapper" out:fade>
          <ul aria-label="dares to be submitted" transition:slide>
            {#each daresToAdd as dare (dare.dareToAddId)}
              <li>
                <NewDare
                  on:discard={() => {
                    dare.removed = true;
                    daresToAdd = daresToAdd.filter((dare) => !dare.removed);
                  }}
                  on:save={async (e) => {
                    dare.saving = true;
                    dare.errors = [];
                    const parsedDare = DareDbInputSchema.safeParse(
                      e.detail.newDare
                    );
                    if (!parsedDare.success) {
                      dare.errors = ["Error saving dare."];
                      dare.saving = false;
                      return;
                    }
                    if (!saveToPublic) {
                      parsedDare.data.status = DARE_STATUS.Enum.private;
                    }
                    const response = await fetch("/api/dares/new", {
                      method: "POST",
                      body: JSON.stringify(parsedDare.data),
                      headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                      },
                    });
                    if (!response.ok) {
                      const error = await response.json();
                      dare.errors = [...dare.errors, error.message];
                      dare.saving = false;
                      return;
                    }
                    const dareAddedRes = await response.json();
                    const dareAdded =
                      DareWithChildrenSchema.safeParse(dareAddedRes);
                    if (!dareAdded.success) {
                      dare.errors = [...dare.errors, "Error in dare response."];
                      dare.saving = false;
                      return;
                    }
                    markNewIds = [dareAdded.data.dareId];
                    GameNewDareIds = [...GameNewDareIds, dareAdded.data.dareId];
                    if (dareAdded.data.partnered) {
                      partneredDaresToSave = [
                        ...partneredDaresToSave.filter((dareInList) => {
                          return !(
                            dare.replaceParent &&
                            dareInList.dareId === dare.parentDare?.dareId
                          );
                        }),
                        dareAdded.data,
                      ];
                    }
                    if (!dareAdded.data.partnered) {
                      soloDaresToSave = [
                        ...soloDaresToSave.filter((dareInList) => {
                          return !(
                            dare.replaceParent &&
                            dareInList.dareId === dare.parentDare?.dareId
                          );
                        }),
                        dareAdded.data,
                      ];
                    }
                    dare.saved = true;
                    setTimeout(() => {
                      dare.saving = false;
                      daresToAdd = daresToAdd.filter((dare) => !dare.saved);
                    }, 1000);
                    invalidateAll();
                  }}
                  saving={dare.saving}
                  dareToAddId={dare.dareToAddId}
                  parentDare={dare.parentDare ?? null}
                  isNewVariant={!!dare.parentDare?.dareId}
                />
                {#if dare.saved}
                  <p transition:slide class="alert">Dare Saved & Selected!</p>
                {/if}
                {#each dare.errors as error}
                  <small class="alert">{error}</small>
                {/each}
              </li>
            {/each}
          </ul>
          <small class="alert">{saveAllError}</small>
          <label>
            <input type="checkbox" bind:checked={saveToPublic} />
            Save dares to public dare list, pending review. New dares will still
            be available to players in this game when unchecked.
          </label>
          <div class="new-dares-btn" transition:fade>
            <Button
              className="icon-only"
              on:click={() => {
                daresToAdd = [
                  ...daresToAdd,
                  {
                    saved: false,
                    saving: false,
                    removed: false,
                    errors: [],
                    dareToAddId: nanoid(),
                  },
                ];
              }}><Plus /></Button
            >
          </div>
          <div class="new-dares-btn" transition:fade>
            <Button
              on:click={async () => {
                savingAll = true;
                saveAllError = "";
                for (const dare of daresToAdd) {
                  dare.saving = true;
                }
                const newDaresMap = getAllNewDares();
                for (const [key, value] of newDaresMap.entries()) {
                  if (
                    !daresToAdd.some(({ dareToAddId }) => dareToAddId === key)
                  ) {
                    newDaresMap.delete(key);
                  }
                  if (!saveToPublic) {
                    value.status = DARE_STATUS.Enum.private;
                  }
                }
                const newDares = Array.from(newDaresMap);
                const response = await fetch("/api/dares", {
                  method: "POST",
                  body: JSON.stringify(newDares),
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                });
                if (!response.ok) {
                  const error = await response.json();
                  saveAllError = error.message;
                  for (const dare of daresToAdd) {
                    dare.saving = false;
                  }
                  savingAll = false;
                  return;
                }
                const { daresAddedToDb, failedIds } = await response.json();
                const parsedReturned =
                  DareWithChildrenSchema.array().safeParse(daresAddedToDb);
                if (!parsedReturned.success || !parsedReturned.data.length) {
                  console.error(
                    !parsedReturned.success
                      ? parsedReturned.error.format()
                      : "No saved dares returned"
                  );
                  saveAllError = "Server error encountered while saving.";
                  for (const dare of daresToAdd) {
                    dare.saving = false;
                  }
                  savingAll = false;
                  return;
                }
                const daresAdded = parsedReturned.data;
                markNewIds = [];
                const newDareIds = daresAdded.map(({ dareId }) => dareId);
                markNewIds = [...newDareIds];
                GameNewDareIds = [...GameNewDareIds, ...newDareIds];
                soloDaresToSave = [
                  ...soloDaresToSave.filter((dare) => {
                    const dareToAdd = daresToAdd.find(
                      ({ parentDare }) => parentDare?.dareId === dare.dareId
                    );
                    const replaceParent = dareToAdd
                      ? !!dareToAdd.replaceParent
                      : false;
                    return !(
                      replaceParent &&
                      daresAdded.some(
                        (addedDare) => addedDare.parentId === dare.dareId
                      )
                    );
                  }),
                  ...daresAdded.filter(({ partnered }) => !partnered),
                ];
                partneredDaresToSave = [
                  ...partneredDaresToSave.filter((dare) => {
                    const dareToAdd = daresToAdd.find(
                      ({ parentDare }) => parentDare?.dareId === dare.dareId
                    );
                    const replaceParent = dareToAdd
                      ? !!dareToAdd.replaceParent
                      : false;
                    return !(
                      replaceParent &&
                      daresAdded.some(
                        (addedDare) => addedDare.parentId === dare.dareId
                      )
                    );
                  }),
                  ...daresAdded.filter(({ partnered }) => partnered),
                ];
                for (const dare of daresToAdd) {
                  if (!failedIds.includes(dare.dareToAddId)) {
                    dare.saved = true;
                  }
                  dare.saving = false;
                }
                if (failedIds.length) {
                  saveAllError = `Error saving above dare${
                    daresToAdd.length > 1 ? "s" : ""
                  }, please try again.`;
                }
                savedAllSuccess = true;
                savingAll = false;
                setTimeout(() => {
                  daresToAdd = daresToAdd.filter((dare) => !dare.saved);
                  savedAllSuccess = false;
                }, 1000);
                invalidateAll();
              }}
              loading={savingAll}
              disabled={savedAllSuccess ||
                savingAll ||
                daresToAdd.some((dare) => dare.saving)}
              >{savedAllSuccess ? "Selected!" : "Save & Select all"}</Button
            >
          </div>
        </div>
      {:else}
        <Button
          className="new-button"
          on:click={() => {
            daresToAdd = [
              ...daresToAdd,
              {
                saved: false,
                saving: false,
                removed: false,
                errors: [],
                dareToAddId: nanoid(),
              },
            ];
          }}>Add New Dares</Button
        >
      {/if}
    </section>
    <section class="your-dares">
      <h3>Your Dares</h3>
      <div class="client-dares-wrapper">
        {#if totalDaresToSave < 3}
          <p class="alert">Please choose at least 3 dares.</p>
        {/if}
        <h3>Solo</h3>
        <ul class="dares-box your-dares-box">
          {#each soloDaresToSave as dare (dare.dareId)}
            <li>
              <Dare {dare} withDetails>
                <svelte:fragment slot="buttons">
                  <Button
                    className={screenWidth > 500 ? "with-icon" : "icon-only"}
                    on:click={() => {
                      daresToAdd = [
                        ...daresToAdd,
                        {
                          saved: false,
                          saving: false,
                          removed: false,
                          errors: [],
                          dareToAddId: nanoid(),
                          parentDare: dare,
                          replaceParent: true,
                        },
                      ];
                    }}
                    >{screenWidth > 500
                      ? "Replace with New Variant"
                      : ""}<PencilSimpleLine /></Button
                  >
                  <Button
                    on:click={() => {
                      soloDaresToSave = soloDaresToSave.filter(
                        ({ dareId }) => dareId !== dare.dareId
                      );
                    }}>Remove</Button
                  >
                </svelte:fragment>
              </Dare>
            </li>
          {/each}
          {#if soloDaresToSave.length < 2}
            <p class="alert">
              Please choose at least 2 <strong>Solo</strong> dares.
            </p>
          {/if}
        </ul>
        <h3>Partnered</h3>
        <ul class="dares-box your-dares-box">
          {#each partneredDaresToSave as dare (dare.dareId)}
            <li>
              <Dare {dare} withDetails>
                <svelte:fragment slot="buttons">
                  <Button
                    className={screenWidth > 500 ? "with-icon" : "icon-only"}
                    on:click={() => {
                      daresToAdd = [
                        ...daresToAdd,
                        {
                          saved: false,
                          saving: false,
                          removed: false,
                          errors: [],
                          dareToAddId: nanoid(),
                          parentDare: dare,
                          replaceParent: true,
                        },
                      ];
                    }}
                    >{screenWidth > 500
                      ? "Replace with New Variant"
                      : ""}<PencilSimpleLine /></Button
                  >
                  <Button
                    on:click={() => {
                      partneredDaresToSave = partneredDaresToSave.filter(
                        ({ dareId }) => dareId !== dare.dareId
                      );
                    }}>Remove</Button
                  >
                </svelte:fragment>
              </Dare>
            </li>
          {/each}
        </ul>
        {#if totalDaresToSave > 10}
          <p class="alert">Maximum 10 dares exceeded. Unable to save.</p>
        {/if}
      </div>
    </section>
    <div class="modal-buttons">
      <Button
        on:click={() => {
          const newDaresMap = getAllNewDares();
          if (
            newDaresMap.size ||
            soloDaresToSave.length !== clientSoloDares.length ||
            partneredDaresToSave.length !== clientPartneredDares.length ||
            !clientSoloDares.every((clientDare) =>
              soloDaresToSave.some((dare) => dare.dareId === clientDare.dareId)
            ) ||
            !soloDaresToSave.every((dare) =>
              clientSoloDares.some(
                (clientDare) => dare.dareId === clientDare.dareId
              )
            ) ||
            !clientPartneredDares.every((clientDare) =>
              partneredDaresToSave.some(
                (dare) => dare.dareId === clientDare.dareId
              )
            ) ||
            !partneredDaresToSave.every((dare) =>
              clientPartneredDares.some(
                (clientDare) => dare.dareId === clientDare.dareId
              )
            )
          ) {
            if (!window.confirm(`Discard all changes?`)) {
              return;
            }
          }
          daresToAdd = [];
          partneredDaresToSave = [];
          soloDaresToSave = [];
          markNewIds = [];
          daresModal.close();
        }}>Cancel</Button
      >
      <Button
        disabled={savingAll ||
          daresToAdd.some(({ saving }) => saving) ||
          totalDaresToSave > 10 ||
          totalDaresToSave < 3 ||
          soloDaresToSave.length < 2}
        on:click={() => {
          const newDaresMap = getAllNewDares();
          if (newDaresMap.size) {
            if (
              !window.confirm(
                `You have unsaved new dares. Discard unsaved new dares and save your selected dares without adding them?`
              )
            ) {
              return;
            }
            daresToAdd = [];
          }
          clientPartneredDares = [...partneredDaresToSave];
          clientSoloDares = [...soloDaresToSave];
          markNewIds = [];
          // socket event update client dares
          // socket event update new game dares
          daresModal.close();
        }}>Save</Button
      >
    </div>
  </div>
</Modal>
<Modal
  bind:modal={interruptModal}
  on:close={() => {
    interrupted = true;
    daresModal.close();
    activeTab = mobileTabs.GAME_LOG;
  }}
>
  <div class="interrupt">
    <p>You're up!</p>
    <p>
      You will be able to come back and pick up where you left off afterwards.
    </p>
    <Button on:click={() => interruptModal.close()}>Show Game Activity</Button>
  </div>
</Modal>

<style>
  h1 {
    color: var(--accent-color);
    font-size: 2.5rem;
    line-height: 0.7;
    align-self: flex-end;
    @media (max-width: 999px) {
      margin-inline: auto;
    }
  }

  .body {
    height: 100vh;
    height: 100dvh;
    display: grid;
    gap: 8px;
    grid-template-rows: auto 1fr auto;
    box-shadow: var(--inner-glow);
    @media (min-width: 1000px) {
      box-shadow: none;
    }
  }

  .page-header {
    grid-row: 1/2;
    display: flex;
    flex-wrap: wrap;
    row-gap: 8px;
    justify-content: space-between;
    padding: 12px 24px;
    align-items: center;
    border: 1px solid var(--accent-color);
    box-shadow:
      var(--inner-glow),
      0px 0px 20px 0px var(--glow-color);
    @media (min-width: 1000px) {
      padding: 12px 24px;
      box-shadow: var(--inner-glow);
    }
  }
  .expanded {
    column-gap: 28px;
  }
  .expanded > :global(:last-child) {
    margin-inline-start: auto;
    /* align-self: center; */
  }
  .game-code {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .main-container {
    container: main-container / size;
    grid-row: 2/3;
  }

  main section {
    border: 1px solid var(--accent-color);
    box-shadow: var(--inner-glow);
    padding: 12px 16px 8px;
    overflow-y: auto;
    border-radius: var(--border-radius-large);
    @media (min-width: 700px) {
      padding: 12px 16px 0px;
    }
  }

  main {
    height: 100cqb;
    display: grid;
    gap: 8px;
    padding-inline: 8px;
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    grid-template-areas:
      "status"
      "panel";
    @media (min-width: 1000px) {
      grid-template-columns: minmax(100px, 1fr) 3fr minmax(100px, 1fr);
      grid-template-rows: 60cqb 40cqb;
      grid-template-areas:
        "players gamelog chat"
        "players dares dares";
    }
  }

  .players {
    grid-area: panel;
    padding: 0;
    display: grid;
    grid-template-rows: 1fr;
    @media (min-width: 1000px) {
      grid-template-rows: auto 1fr;
      grid-area: players;
    }
    & header {
      padding: 8px 16px;
      grid-row: 1 / 2;
      border-bottom: 1px solid var(--accent-color);
    }
  }

  .players-list-container {
    container: players-list / size;
    @media (min-width: 1000px) {
      grid-row: 2 / 3;
    }
  }

  .players-list {
    height: 100cqb;
    overflow-y: auto;
    & li {
      border: 1px solid var(--accent-color);
      padding: 12px 16px;
    }
  }

  .darer {
    box-shadow: var(--inner-glow);
  }
  .daree {
    box-shadow: 0px 0px 16px 0px var(--pop-color) inset;
  }
  .host-player-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .gamelog {
    grid-area: 1/1/-1/-1;
    container: gamelog / size;
    padding-block-end: 12px;
    @media (min-width: 1000px) {
      grid-area: gamelog;
      padding-block-end: 12px;
    }
  }
  .gamelog-scroll {
    display: grid;
    height: 100cqb;
    overflow-y: auto;
    grid-template-rows: 1fr auto;
    gap: 12px;
    @media (min-width: 1000px) {
      grid-template-rows: auto 1fr auto;
      & header {
        grid-row: 1 / 2;
      }
    }
  }

  .gamelog-list-container {
    grid-row: 1 / 2;
    container: gamelog-list / size;
    @media (min-width: 1000px) {
      grid-row: 2 / 3;
    }
  }

  .gamelog-list {
    max-height: 100cqb;
    overflow-y: auto;
    display: grid;
    gap: 12px;
    justify-items: start;
    @media (min-width: 1000px) {
      padding-inline-end: 4px;
    }
    & li {
      padding: 8px 16px;
      border-radius: var(--border-radius-med);
      border: 1px solid var(--accent-color);
      box-shadow: var(--inner-glow);
    }
  }

  .activity {
    grid-row: 2 / 3;
    display: grid;
    gap: 16px;
    @media (min-width: 1000px) {
      grid-row: 3 / 4;
    }
  }

  .activity,
  .mobile-status {
    background-color: var(--pop-color);
    color: var(--background-color);
    padding: 12px 16px 16px;
    border-radius: var(--border-radius-med);
    border: 1px solid var(--accent-color);
    & strong {
      color: var(--background-color);
    }
  }
  .activity h3 {
    color: var(--background-color);
    font-size: 1.25rem;
  }
  .activity ul {
    display: grid;
    gap: 12px;
  }

  .activity > :global(.center) {
    justify-self: center;
  }
  .activity > :global(.start) {
    justify-self: start;
  }

  .keep-buttons {
    display: flex;
    flex-wrap: wrap;
    column-gap: 16px;
    row-gap: 12px;
    @container (max-width: 450px) {
      flex-direction: column;
    }
  }
  /* @container (max-width: 450px) {
    .keep-buttons{
      flex-direction: column;
    }
  } */

  .current-activity {
    display: grid;
    gap: 4px;
    @media (min-width: 1000px) {
      gap: 16px;
    }
  }

  .mobile-status {
    grid-area: status;
    gap: 4px;
  }

  .dares {
    grid-area: panel;
    display: grid;
    grid-template-rows: auto 1fr;
    @media (min-width: 1000px) {
      grid-area: dares;
    }
  }
  .dares-top {
    grid-row: 1 / 2;
    & header {
      display: flex;
      & > :last-child {
        margin-inline-start: auto;
        align-self: center;
      }
    }
  }

  .dare-lists {
    grid-row: 2 / 3;
    container: dare-lists / size;
    display: grid;
    column-gap: 16px;
    row-gap: 8px;
    @media (min-width: 700px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .dare-list {
    max-height: 100cqb;
    display: grid;
    grid-template-rows: auto 1fr;
    & h3 {
      grid-row: 1 / 2;
    }
  }

  .client-dares-container {
    grid-row: 2 / 3;
    container-type: size;
    margin-block-start: 8px;
    overflow: hidden;
    @media (max-width: 700px) {
      border: 1px solid var(--accent-color);
      border-radius: var(--border-radius-med);
    }
  }
  .client-dares {
    max-height: 100cqb;
    overflow: auto;
    display: grid;
    gap: 12px;
    @media (min-width: 700px) {
      padding-inline-end: 4px;
    }
    & li {
      padding: 8px 16px;
      border-radius: var(--border-radius-med);
      border: 1px solid var(--accent-color);
      box-shadow: var(--inner-glow);
    }
  }
  .dares .alert {
    padding-block: 8px;
    @media (max-width: 700px) {
      font-size: 0.8em;
    }
  }
  .dare-list .alert {
    padding-inline: 8px;
  }

  .chat {
    grid-area: panel;
    display: grid;
    grid-template-rows: auto 1fr auto auto;
    gap: 12px;
    padding-block-end: 12px;
    container: chat / inline-size;
    @media (min-width: 1000px) {
      grid-area: chat;
    }
    & header {
      grid-row: 1 / 2;
    }
  }

  .chat > :global(:last-child) {
    justify-self: end;
    grid-row: 4 / 5;
  }

  .chat-box {
    overflow-wrap: break-word;
    overflow-y: auto;
    padding-inline-start: 4px;
    max-height: 3lh;
    outline: none;
  }

  .chat-box-container {
    grid-row: 3 / 4;
    width: 100cqi;
    min-width: 50px;
    border-radius: 5px;
    background-color: hsl(247, 10%, 18%);
    border-top: 2px solid hsl(345, 80%, 32%);
    border-left: 2px solid hsl(345, 80%, 32%);
    border-right: 2px solid var(--accent-color);
    border-bottom: 2px solid var(--accent-color);
    &:focus-within {
      outline: 3px solid var(--accent-color);
    }
  }

  .chatlog-container {
    grid-row: 2 / 3;
    container: chatlog / size;
    border: 1px solid var(--accent-color);
    border-radius: var(--border-radius-small);
    padding-block: 8px;
  }

  .chatlog {
    max-height: calc(100cqb - 4px);
    position: relative;
    overflow: auto;
    display: grid;
    gap: 12px;
    padding-inline: 8px 4px;
  }

  .pending-chat {
    opacity: 0.65;
  }

  footer {
    grid-row: 3/4;
    box-shadow: 0px 0px 20px 0px var(--glow-color);
  }

  footer ul {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
  }
  footer li {
    display: grid;
    border: 1px solid var(--accent-color);
    box-shadow: var(--inner-glow);
  }
  footer li[aria-selected="true"] {
    --glow-color: var(--pop-color);
    box-shadow: 0px 0px 12px 0px var(--glow-color) inset;
  }
  footer button {
    background-color: inherit;
    line-height: 1;
    padding-block: 12px;
  }

  .inactive {
    display: none;
  }

  #chat-tab span {
    position: relative;
  }

  .newChat {
    position: absolute;
    top: 0;
    right: -0.3em;
    width: 0.5rem;
    aspect-ratio: 1;
    border-radius: 50%;
    background-color: var(--accent-color);
  }

  .new {
    outline: 1px solid var(--pop-color);
  }
  .solo-dare,
  .dares-box > li {
    margin-block-start: 1rem;
    padding: 1rem;
    border-radius: var(--border-radius-med);
    border: 1px solid var(--accent-color);
    box-shadow: var(--inner-glow);
  }

  .your-dares-box > li:first-child {
    margin-block-start: 0;
  }

  .dares-modal {
    padding-block-end: 4px;
  }
  .dares-modal section {
    margin-block-end: 1.25rem;
    margin-block-start: 0.75rem;
  }
  .new-dares-wrapper,
  .all-dares,
  .client-dares-wrapper {
    display: grid;
    border: 1px solid var(--accent-color);
    border-radius: var(--border-radius-med);
    padding-inline: 1rem;
    padding-block-end: 1rem;
    margin-block-start: 0.75rem;
  }
  .all-dares {
    max-height: 50vh;
    overflow: hidden;
    @media (max-width: 350px) {
      padding-inline: 0;
    }
  }
  .scroll {
    overflow: auto;
    max-height: inherit;
    padding-block-end: 12px;
  }
  .db-dares {
    margin-block-start: 1.25rem;
  }
  .client-dares-wrapper {
    display: grid;
    padding-block-start: 1rem;
    row-gap: 1rem;
  }
  .new-dares :global(.new-button) {
    justify-self: start;
  }
  .new-dares :global(.new-dares-btn) {
    justify-self: end;
    margin-block-start: 0.75rem;
  }

  .modal-buttons {
    display: flex;
    justify-content: flex-end;
    margin-block-start: 1.5rem;
    row-gap: 0.75rem;
    column-gap: 0.5rem;
  }

  .interrupt {
    display: flex;
    flex-direction: column;
    & > :last-child {
      align-self: flex-end;
    }
  }
</style>
