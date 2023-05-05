<script lang="ts">
  import { customAlphabet } from "nanoid";
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { GameCodeSchema, PlayerNameSchema } from "../../lib/gametypes";
  import { enhance } from "$app/forms";
  import { dataset_dev } from "svelte/internal";

  export let form;
  let gameCode: string = "";
  let playerName: string = "";
  let join: HTMLDialogElement;
  let create: HTMLDialogElement;
  let alert: string;
  $: switch ($page.url.searchParams.get("message")) {
    case "gameerror":
      alert = "Error initializing game, please try again";
      break;
    default:
      alert = "";
  }
  $: parsedCode = GameCodeSchema.safeParse(gameCode);
  $: gameWarnings =
    gameCode && !parsedCode.success ? parsedCode.error.format()._errors : [""];
  $: if (form?.gameGenerated) {
    create.showModal();
  }
  $: if (form?.gameFound) {
    join.showModal();
  }
  $: parsedName = PlayerNameSchema.safeParse(playerName);
  $: nameWarnings =
    playerName && !parsedName.success
      ? parsedName.error.format()._errors
      : [""];
</script>

<h1>Dare Me</h1>
{#if alert}
  <p class="alert">{alert}</p>
{/if}
<!-- {#if form?.data?.generateGameError}
  <p class="alert">{form.dataset_dev.generateGameError}</p> gah
{/if} -->
<form
  action="generateGame"
  use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === "success") {
        sessionStorage.setItem("gameCode", result.data?.gameCode);
        console.log("stored gameCode", result.data?.gameCode);
      }
      update();
    };
  }}
>
  <button>Start a New Game</button>
</form>
<p>or</p>
<form
  action="findGame"
  use:enhance={() => {
    return async ({ result, update }) => {
      if (result.type === "success") {
        sessionStorage.setItem("gameCode", result.data?.verifiedCode);
        console.log("stored gameCode", result.data?.gameCode);
      }
      update();
    };
  }}
>
  <label>
    Game Code: <input name="gameCode" type="text" bind:value={gameCode} />
  </label>
  {#if form?.findGameErrors}
    {#each form.findGameErrors._errors as errorMessage}
      <p class="alert">{errorMessage}</p>
    {/each}
  {/if}
  {#each gameWarnings as gameWarning}
    <p class="alert">{gameWarning}</p>
  {/each}
  <button disabled={!parsedCode.success}>Join Game</button>
</form>
<dialog bind:this={create}>
  <form
    action="launchGame"
    use:enhance={({ data, cancel }) => {
      const code = sessionStorage.getItem("gameCode");
      if (!parsedName.success || !code) {
        cancel();
        return;
      }
      const playerId = crypto.randomUUID();
      sessionStorage.setItem("playerId", playerId);
      sessionStorage.setItem("playerName", parsedName.data);
      data.set("gameCode", code);
      data.set("hostId", playerId);
    }}
  >
    <label
      >Name: <input
        name="hostName"
        type="text"
        bind:value={playerName}
      /></label
    ><button disabled={!parsedName.success}>Launch Game</button>
  </form>
</dialog>
<dialog bind:this={join}>
  <form action="joinGame">
    <label
      >Name: <input
        name="playerName"
        type="text"
        bind:value={playerName}
      /></label
    ><button
      disabled={!parsedName.success}
      on:click={() => {
        if (parsedName.success) {
          const playerId = crypto.randomUUID();
          sessionStorage.setItem("playerId", playerId);
          sessionStorage.setItem("playerName", parsedName.data);
          goto(`/games/${sessionStorage.getItem("gameCode")}`);
        }
      }}>Launch Game</button
    >
  </form>
</dialog>
