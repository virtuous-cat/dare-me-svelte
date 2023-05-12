<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { GameCodeSchema, PlayerNameSchema } from "../../lib/gametypes";
  import { enhance } from "$app/forms";
  import Modal from "$lib/Modal.svelte";
  import TextInput from "$lib/TextInput.svelte";
  import Button from "$lib/Button.svelte";

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
  $: parsedName = PlayerNameSchema.safeParse(playerName);
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
      create.showModal();
    };
  }}
>
  <Button disabled={generating || finding || creating || joining}
    >Start a New Game
  </Button>
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
      await update({ reset: false });
      finding = false;
      join.showModal();
    };
  }}
>
  <TextInput
    name="gameCode"
    bind:value={gameCode}
    disabled={generating || finding || creating || joining}
    label="Game Code:"
    schema={GameCodeSchema}
  />
  {#if form?.findGameErrors}
    {#each form.findGameErrors._errors as errorMessage}
      <p class="alert">{errorMessage}</p>
    {/each}
  {/if}
  <Button
    disabled={!GameCodeSchema.safeParse(gameCode).success ||
      generating ||
      finding ||
      creating ||
      joining}
    loading={finding}
    >Join Game
  </Button>
</form>
<Modal bind:modal={create}>
  <form
    method="POST"
    action="?/launchGame"
    use:enhance={({ data, cancel }) => {
      creating = true;
      const code = sessionStorage.getItem("gameCode");
      const playerId = crypto.randomUUID();
      if (!parsedName.success || !code || !playerId) {
        cancel();
        creating = false;
        return;
      }
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
    <TextInput
      name="hostName"
      label="Name:"
      schema={PlayerNameSchema}
      bind:value={playerName}
      disabled={generating || finding || creating || joining}
    />
    <div class="button-wrapper">
      <Button
        on:click={(e) => {
          e.preventDefault();
          create.close();
        }}
        disabled={generating || finding || creating || joining}>Cancel</Button
      >
      <Button
        disabled={!parsedName.success ||
          generating ||
          finding ||
          creating ||
          joining}
        loading={creating}
        >Launch Game
      </Button>
    </div>
  </form>
</Modal>
<Modal bind:modal={join}>
  <TextInput
    name="playerName"
    label="Name:"
    schema={PlayerNameSchema}
    bind:value={playerName}
    disabled={generating || finding || creating || joining}
  />
  <div class="button-wrapper">
    <Button
      on:click={(e) => {
        join.close();
      }}
      disabled={generating || finding || creating || joining}>Cancel</Button
    >
    <Button
      disabled={!parsedName.success ||
        generating ||
        finding ||
        creating ||
        joining}
      on:click={() => {
        joining = true;
        const playerId = crypto.randomUUID();
        if (!parsedName.success || !playerId) {
          alert = "Error launching game, please try again";
          joining = false;
          join.close();
          return;
        }
        sessionStorage.setItem("playerId", playerId);
        sessionStorage.setItem("playerName", parsedName.data);
        goto(`/games/${sessionStorage.getItem("gameCode")}`);
      }}
      loading={joining}
      >Launch Game
    </Button>
  </div>
</Modal>
