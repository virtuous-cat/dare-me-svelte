<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { GameCodeSchema, PlayerNameSchema } from "../../lib/game.types";
  import { enhance } from "$app/forms";
  import Modal from "$lib/Modal.svelte";
  import TextInput from "$lib/TextInput.svelte";
  import Button from "$lib/Button.svelte";
  import {
    CATEGORY,
    INTERACTION,
    type Category,
    type Interaction,
  } from "$lib/db.types";
  import type { ActionData } from "./$types";

  console.log("(site) page in");

  export let form: ActionData;
  let gameCode: string = "";
  let playerName: string = "";
  let join: HTMLDialogElement;
  let create: HTMLDialogElement;
  let alert: string;
  let generating: boolean = false;
  let finding: boolean = false;
  let creating: boolean = false;
  let joining: boolean = false;
  let interactions: Interaction;
  let categories: Category[] = [];
  let unmasked: boolean = false;
  let nameErrors = [""];
  let codeErrors = [""];
  let categoryError: string = "";
  $: switch ($page.url.searchParams.get("message")) {
    case "gameerror":
      alert = "Error initializing game, please try again";
      break;
    default:
      alert = "";
  }
  $: parsedName = PlayerNameSchema.safeParse(playerName);

  console.log("(site) page out");
</script>

<svelte:head>
  <title>Dare Me</title>
</svelte:head>

<main>
  <h1 class="logo-font">Dare Me</h1>
  {#if alert}
    <p class="alert">{alert}</p>
  {/if}
  {#if form?.generateGameErrors}
    {#each form.generateGameErrors._errors as errorMessage}
      <p class="alert">{errorMessage}</p>
    {/each}
  {/if}
  {#if form?.launchGameErrors}
    {#each form.launchGameErrors._errors as errorMessage}
      <p class="alert">{errorMessage}</p>
    {/each}
  {/if}
  <form
    method="POST"
    action="?/generateGame"
    use:enhance={() => {
      generating = true;
      return async ({ result, update }) => {
        if (result.type === "success") {
          if (typeof result.data?.gameCode === "string") {
            sessionStorage.setItem("gameCode", result.data?.gameCode);
            console.log("stored gameCode", result.data?.gameCode);
          } else {
            console.log("failed type check in generateGame return");
          }
        }
        await update();
        generating = false;
        if (result.type === "success") {
          create.showModal();
        }
      };
    }}
  >
    <Button disabled={generating || finding || creating || joining}
      >Start a New Game
    </Button>
  </form>
  <p>or</p>
  <form
    class="find-game"
    method="POST"
    action="?/findGame"
    use:enhance={({ cancel }) => {
      finding = true;
      const parsedCode = GameCodeSchema.safeParse(gameCode);
      if (!parsedCode.success) {
        cancel();
        codeErrors = parsedCode.error.format()._errors;
        finding = false;
        return;
      }
      return async ({ result, update }) => {
        if (result.type === "success") {
          if (typeof result.data?.verifiedCode === "string") {
            sessionStorage.setItem("gameCode", result.data?.verifiedCode);
            console.log("stored gameCode", result.data?.verifiedCode);
          } else {
            console.log("failed type check in findGame return");
          }
        }
        await update({ reset: false });
        finding = false;
        if (result.type === "success") {
          join.showModal();
        }
      };
    }}
  >
    <TextInput
      name="gameCode"
      bind:value={gameCode}
      disabled={generating || finding || creating || joining}
      label="Game Code:"
      schema={GameCodeSchema}
      warnings={codeErrors}
    />
    {#if form?.findGameErrors}
      {#each form.findGameErrors._errors as errorMessage}
        <p class="alert">{errorMessage}</p>
      {/each}
    {/if}
    <Button
      disabled={generating || finding || creating || joining}
      loading={finding}
      >Join Game
    </Button>
  </form>
</main>
<Modal bind:modal={create}>
  <TextInput
    name="hostName"
    label="Name:"
    schema={PlayerNameSchema}
    bind:value={playerName}
    disabled={generating || finding || creating || joining}
    warnings={nameErrors}
  />
  <form
    method="POST"
    action="?/launchGame"
    use:enhance={({ formData, cancel }) => {
      creating = true;
      if (!parsedName.success) {
        cancel();
        nameErrors = parsedName.error.format()._errors;
        creating = false;
        return;
      }
      if (!categories.length) {
        cancel();
        categoryError = "Please select at least one category.";
        creating = false;
        return;
      }
      const code = sessionStorage.getItem("gameCode");
      const playerId = crypto.randomUUID();
      if (!code || !playerId) {
        cancel();
        alert = "Error launching game, please try again";
        creating = false;
        create.close();
        return;
      }
      sessionStorage.setItem("playerId", playerId);
      sessionStorage.setItem("playerName", parsedName.data);
      formData.set("gameCode", code);
      formData.set("hostId", playerId);
      formData.set("categories", JSON.stringify(categories));
      if (unmasked) {
        formData.set("interaction", INTERACTION.Enum.unmasked);
      }
      return async ({ update }) => {
        await update();
        creating = false;
        create.close();
      };
    }}
  >
    <fieldset>
      <legend>
        Choose which categories of dares will be available for players to choose
        from:
        <small
          >(This will only affect which dares are listed from the database, and
          will not limit dares the players create themselves.)</small
        >
      </legend>
      {#if categoryError}
        <p class="alert">{categoryError}</p>
      {/if}
      <label>
        <input
          type="checkbox"
          name="categories"
          value={CATEGORY.Enum.kink}
          bind:group={categories}
          on:click={() => {
            if (categoryError) {
              categoryError = "";
            }
          }}
        />
        Kink (significant BDSM or fetish content, primarily not explicitly sexual)
      </label>
      <label>
        <input
          type="checkbox"
          name="categories"
          value={CATEGORY.Enum.sex}
          bind:group={categories}
          on:click={() => {
            if (categoryError) {
              categoryError = "";
            }
          }}
        />
        Sex (any direct genital contact, including masturbation)
      </label>
      <label>
        <input
          type="checkbox"
          name="categories"
          value={CATEGORY.Enum.foreplay}
          bind:group={categories}
          on:click={() => {
            if (categoryError) {
              categoryError = "";
            }
          }}
        />
        Foreplay (significant sexual interaction not involving bare genitals, e.g.
        making out or nipple play)
      </label>
      <label>
        <input
          type="checkbox"
          name="categories"
          value={CATEGORY.Enum.flirty}
          bind:group={categories}
          on:click={() => {
            if (categoryError) {
              categoryError = "";
            }
          }}
        />
        Flirty (e.g. striptease or massage)
      </label>
      <label>
        <input
          type="checkbox"
          name="categories"
          value={CATEGORY.Enum.truth}
          bind:group={categories}
          on:click={() => {
            if (categoryError) {
              categoryError = "";
            }
          }}
        />
        Truth (may contain questions on topics related to any other category)
      </label>
    </fieldset>
    <fieldset>
      <legend>
        How is your group playing today?
        <small
          >(Dares requiring higher levels of interaction will be omitted. Dare
          Me is best paired with an external communications method, only text
          chat is available in-game.)</small
        >
      </legend>
      <label>
        <input
          type="radio"
          name="interaction"
          value={INTERACTION.enum.physical}
          bind:group={interactions}
        />
        In-Person
      </label>
      {#if interactions === INTERACTION.Enum.physical}
        <label
          ><input type="checkbox" bind:checked={unmasked} />Include dares that
          require at least one player to be unmasked</label
        >
      {/if}
      <label>
        <input
          type="radio"
          name="interaction"
          value={INTERACTION.Enum.video}
          bind:group={interactions}
        />
        Video Call
      </label>
      <label>
        <input
          type="radio"
          name="interaction"
          value={INTERACTION.Enum.audio}
          bind:group={interactions}
        />
        Voice Call
      </label>
      <label>
        <input
          type="radio"
          name="interaction"
          value={INTERACTION.Enum.chat}
          bind:group={interactions}
          checked
        />
        Text Chat
      </label>
    </fieldset>
    <div class="button-wrapper">
      <Button
        on:click={(e) => {
          e.preventDefault();
          create.close();
        }}
        disabled={generating || finding || creating || joining}>Cancel</Button
      >
      <Button
        disabled={generating || finding || creating || joining}
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
    warnings={nameErrors}
  />
  <div class="button-wrapper">
    <Button
      on:click={(e) => {
        join.close();
      }}
      disabled={generating || finding || creating || joining}>Cancel</Button
    >
    <Button
      disabled={generating || finding || creating || joining}
      on:click={() => {
        joining = true;
        if (!parsedName.success) {
          nameErrors = parsedName.error.format()._errors;
          joining = false;
          return;
        }
        const playerId = crypto.randomUUID();
        if (!playerId) {
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

<style>
  main {
    max-width: 900px;
    margin: 0 auto;
    display: grid;
    justify-content: center;
    text-align: center;
    & > * {
      margin-block-end: 1.25rem;
    }
  }

  h1 {
    font-size: 128px;
    font-size: clamp(4.75rem, 20vw - 3rem, 8rem);
    line-height: 1;
    color: var(--accent-color);
    margin: 0.5em 0;
  }

  p {
    font-size: 1.5rem;
  }

  .find-game {
    display: flex;
    flex-direction: column;
    align-items: center;
    & > * {
      margin-block-end: 0.5rem;
    }
  }
</style>
