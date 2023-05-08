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
  let generating: boolean = false;
  let finding: boolean = false;
  let creating: boolean = false;
  let joining: boolean = false;
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
  method="POST"
  action="?/generateGame"
  use:enhance={() => {
    generating = true;
    return async ({ result, update }) => {
      if (result.type === "success") {
        sessionStorage.setItem("gameCode", result.data?.gameCode);
        console.log("stored gameCode", result.data?.gameCode);
      }
      await update();
      generating = false;
    };
  }}
>
  <button disabled={generating || finding || creating || joining}
    >Start a New Game
    {#if generating}
      <span>Loading...</span>
    {/if}
  </button>
</form>
<p>or</p>
<form
  method="POST"
  action="?/findGame"
  use:enhance={() => {
    finding = true;
    return async ({ result, update }) => {
      if (result.type === "success") {
        sessionStorage.setItem("gameCode", result.data?.verifiedCode);
        console.log("stored gameCode", result.data?.verifiedCode);
      }
      await update();
      finding = false;
    };
  }}
>
  <label>
    Game Code: <input
      name="gameCode"
      type="text"
      bind:value={gameCode}
      disabled={generating || finding || creating || joining}
    />
  </label>
  {#if form?.findGameErrors}
    {#each form.findGameErrors._errors as errorMessage}
      <p class="alert">{errorMessage}</p>
    {/each}
  {/if}
  {#each gameWarnings as gameWarning}
    <p class="alert">{gameWarning}</p>
  {/each}
  <button
    disabled={!parsedCode.success ||
      generating ||
      finding ||
      creating ||
      joining}
    >Join Game
    {#if finding}
      <span>Loading...</span>
    {/if}
  </button>
</form>
<dialog bind:this={create}>
  <form
    method="POST"
    action="?/launchGame"
    use:enhance={({ data, cancel }) => {
      creating = true;
      const code = sessionStorage.getItem("gameCode");
      if (!parsedName.success || !code) {
        cancel();
        creating = false;
        return;
      }
      const playerId = crypto.randomUUID();
      sessionStorage.setItem("playerId", playerId);
      sessionStorage.setItem("playerName", parsedName.data);
      data.set("gameCode", code);
      data.set("hostId", playerId);
      return async ({ update }) => {
        await update();
        creating = false;
      };
    }}
  >
    <label
      >Name: <input
        name="hostName"
        type="text"
        bind:value={playerName}
        disabled={generating || finding || creating || joining}
      /></label
    >
    <div class="button-wrapper">
      <button
        on:click|preventDefault={() => create.close()}
        disabled={generating || finding || creating || joining}>Cancel</button
      >
      <button
        disabled={!parsedName.success ||
          generating ||
          finding ||
          creating ||
          joining}
        >Launch Game
        {#if creating}
          <span>Loading...</span>
        {/if}
      </button>
    </div>
  </form>
</dialog>
<dialog bind:this={join}>
  <label
    >Name: <input
      name="playerName"
      type="text"
      bind:value={playerName}
    /></label
  >
  <div class="button-wrapper">
    <button
      on:click|preventDefault={() => join.close()}
      disabled={generating || finding || creating || joining}>Cancel</button
    >
    <button
      disabled={!parsedName.success ||
        generating ||
        finding ||
        creating ||
        joining}
      on:click={() => {
        if (parsedName.success) {
          joining = true;
          const playerId = crypto.randomUUID();
          sessionStorage.setItem("playerId", playerId);
          sessionStorage.setItem("playerName", parsedName.data);
          joining = false;
          goto(`/games/${sessionStorage.getItem("gameCode")}`);
        }
      }}
      >Launch Game
      {#if joining}
        <span>Loading...</span>
      {/if}
    </button>
  </div>
</dialog>
