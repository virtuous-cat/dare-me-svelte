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
  import { getContext, onMount, setContext } from "svelte";
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
  import { i } from "vitest/dist/index-5aad25c1";
  import Modal from "$lib/Modal.svelte";
  import DareListFilter from "$lib/DareListFilter.svelte";
  import Dare from "$lib/Dare.svelte";
  import { nanoid } from "nanoid";
  import { fade, slide } from "svelte/transition";
  import NewDare, { getAllNewDares } from "$lib/NewDare.svelte";
  import { writable, type Writable } from "svelte/store";

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

  export let data;
  export let form;
  // const admin = getContext<Writable<boolean>>("admin");
  // const loggedIn = getContext<Writable<boolean>>("admin");
  // TODO: Update when Auth
  const loggedIn = false;
  let screenWidth: number;
  $: wide = screenWidth > 700;
  let hideCode: boolean = true;
  let codeCopySuccess: boolean = false;
  let codeCopyError: boolean = false;
  let clientSoloDares: DareWithChildren[] = [];
  let clientPartneredDares: DareWithChildren[] = [];
  let players = new Map<string, Player>([
    [
      clientPlayerId,
      {
        playerId: clientPlayerId,
        playerName: clientPlayerName,
        ready: false,
        dares: [...clientSoloDares, ...clientPartneredDares].map((dare) => {
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

  let daresModal: HTMLDialogElement;
  $: soloDaresToSave = [...clientSoloDares];
  $: partneredDaresToSave = [...clientPartneredDares];
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

  let editInProcess: boolean = false;
  let daresToAdd: (NewDareState & {
    parentDare?: DareWithChildren;
    replaceParent?: boolean;
  })[] = [];
  let markNewIds: string[] = [];

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
            <!-- {#if player.playerId === host}
              <div>
                <small>HOST</small>
                {#if host === clientPlayerId}
                  <Button>Host Actions</Button>
                {/if}
              </div>
            {:else if host === clientPlayerId}
              <Button>host action: kick</Button>
            {/if} -->
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
      {#if clientSoloDares.length + clientPartneredDares.length < 3}
        <p class="alert">
          Please choose at least 3 dares to be included in the next spin.
        </p>
      {/if}
      <h3>Solo</h3>
      <ul class="client-dares">
        {#each clientSoloDares as dare (dare.dareId)}
          <li><strong>{dare.dareText}</strong></li>
        {:else}
          <p class="alert">
            Please choose at least 2 solo dares to be included in the next spin.
          </p>
        {/each}
      </ul>
      <h3>Partnered</h3>
      <ul class="client-dares">
        {#each clientPartneredDares as dare (dare.dareId)}
          <li><strong>{dare.dareText}</strong></li>
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
<Modal bind:modal={daresModal}>
  <p>
    Choose 3-10 dares you want to do. You must always have at least 2 solo
    dares. You can update your dares throughout the game.
  </p>
  <h3>All Dares</h3>
  <div class="all-dares">
    <DareListFilter bind:filtered {dares} />
    <ul id="dare-list" class="dares">
      {#each $filteredDares as filteredDare (filteredDare.dare.dareId)}
        <li class={markNewIds.includes(filteredDare.dare.dareId) ? "new" : ""}>
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
                }}>Add New Variant</Button
              >
              <Button
                disabled={partneredDaresToSave.some(
                  ({ dareId }) => dareId === filteredDare.dare.dareId
                ) ||
                  soloDaresToSave.some(
                    ({ dareId }) => dareId === filteredDare.dare.dareId
                  )}
                on:click={() => {
                  if (filteredDare.dare.partnered) {
                    partneredDaresToSave = [
                      ...partneredDaresToSave,
                      filteredDare.dare,
                    ];
                  } else {
                    soloDaresToSave = [...soloDaresToSave, filteredDare.dare];
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
                }}>Add New Variant</Button
              >
              <Button
                disabled={partneredDaresToSave.some(
                  ({ dareId }) => dareId === variantId
                ) || soloDaresToSave.some(({ dareId }) => dareId === variantId)}
                on:click={() => {
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
                ) || soloDaresToSave.some(({ dareId }) => dareId === variantId)
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
  <p>Or</p>
  <Button
    on:click={() => {
      const randomIndex = Math.floor(Math.random() * dares.length);
      randomDare = dares[randomIndex];
    }}>Find a Random Dare</Button
  >
  {#if randomDare}
    <Dare dare={randomDare} withDetails withVariants>
      <svelte:fragment slot="buttons">
        <Button
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
          }}>Add New Variant</Button
        >
        <Button
          disabled={partneredDaresToSave.some(
            ({ dareId }) => dareId === randomDare?.dareId
          ) ||
            soloDaresToSave.some(({ dareId }) => dareId === randomDare?.dareId)}
          on:click={() => {
            if (!randomDare) {
              return;
            }
            if (randomDare.partnered) {
              partneredDaresToSave = [...partneredDaresToSave, randomDare];
            } else {
              soloDaresToSave = [...soloDaresToSave, randomDare];
            }
          }}
          >{partneredDaresToSave.some(
            ({ dareId }) => dareId === randomDare?.dareId
          ) ||
          soloDaresToSave.some(({ dareId }) => dareId === randomDare?.dareId)
            ? "Selected!"
            : "Select"}</Button
        >
      </svelte:fragment>
      <svelte:fragment slot="variant-buttons" let:variantId>
        <Button
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
          }}>Add New Variant</Button
        >
        <Button
          disabled={partneredDaresToSave.some(
            ({ dareId }) => dareId === variantId
          ) || soloDaresToSave.some(({ dareId }) => dareId === variantId)}
          on:click={() => {
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
          >{partneredDaresToSave.some(({ dareId }) => dareId === variantId) ||
          soloDaresToSave.some(({ dareId }) => dareId === variantId)
            ? "Selected!"
            : "Select"}</Button
        >
      </svelte:fragment>
    </Dare>
  {/if}
  <p>Or</p>
  {#if daresToAdd.length}
    <h2 transition:fade>New Dares</h2>
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
        Save dares to public dare list, pending review. New dares will still be available
        to players in this game when unchecked.
      </label>
      <div class="new-dares-btn" transition:fade>
        <Button
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
          }}>+</Button
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
              if (!daresToAdd.some(({ dareToAddId }) => dareToAddId === key)) {
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
            daresAdded.forEach(
              ({ dareId }) => (markNewIds = [...markNewIds, dareId])
            );
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

  <h3>Your Dares</h3>
  {#if clientSoloDares.length + clientPartneredDares.length < 3}
    <p class="alert">Please choose at least 3 dares.</p>
  {/if}
  <h3>Solo</h3>
  <ul class="client-dares">
    {#each soloDaresToSave as dare (dare.dareId)}
      <li>
        <Dare {dare} withDetails>
          <svelte:fragment slot="buttons">
            <Button
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
              }}>Replace with New Variant</Button
            >
            <!-- TODO -->
            <Button>Remove</Button>
          </svelte:fragment>
        </Dare>
      </li>
    {:else}
      <p class="alert">Please choose at least 2 solo dares.</p>
    {/each}
  </ul>
  <h3>Partnered</h3>
  <ul class="client-dares">
    {#each partneredDaresToSave as dare (dare.dareId)}
      <!-- TODO -->
      <li><Dare /></li>
    {/each}
  </ul>
  {#if clientSoloDares.length + clientPartneredDares.length > 10}
    <p class="alert">Maximum 10 dares. Unable to save.</p>
  {/if}
  <div class="modal-buttons">
    <!-- TODO -->
    <Button>Cancel</Button>
    <Button>Save</Button>
  </div>
</Modal>

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
