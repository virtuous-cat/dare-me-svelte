<script lang="ts">
  import { z } from "zod";
  import TextInput from "./TextInput.svelte";
  import {
    CATEGORY,
    INTERACTION,
    type Category,
    type DareWithChildren,
    type Interaction,
    type DareStatus,
    DARE_STATUS,
  } from "./db.types";

  export let filterable: boolean = false;
  export let loggedIn: boolean = false;
  export let admin: boolean = false;
  export let dares: DareWithChildren[] = [];

  let categoryFilter: Category[] = [];
  let interactionFilter: Interaction[] = [];
  let statusFilter: DareStatus[] = [];
  let partneredFilter: ("partnered" | "solo")[] = [];
  let search: string = "";

  $: filteredDares =
    !categoryFilter.length &&
    !interactionFilter.length &&
    !statusFilter.length &&
    !search
      ? dares
      : dares.filter((dare) => {
          const partneredFound =
            partneredFilter.length !== 1 ||
            (partneredFilter[0] === "partnered" && dare.partnered) ||
            (partneredFilter[0] === "solo" && !dare.partnered)
              ? true
              : false;
          const categoryFound = !categoryFilter.length
            ? true
            : categoryFilter.includes(dare.category);
          const interactionFound = !interactionFilter.length
            ? true
            : interactionFilter.includes(dare.minInteraction);
          const statusFound = !statusFilter.length
            ? true
            : statusFilter.includes(dare.status);
          const tagFound =
            !search ||
            dare.tags.filter((tag) => tag.name === search.toLowerCase()).length
              ? true
              : false;
          const textFound = !search
            ? true
            : dare.dareText.toLocaleLowerCase().includes(search.toLowerCase());
          return (
            (tagFound || textFound) &&
            categoryFound &&
            interactionFound &&
            statusFound &&
            partneredFound
          );
        });
</script>

{#if filterable}
  <TextInput
    bind:value={search}
    schema={z.string()}
    label="Search:"
    name="search"
  />
  <p>Filter:</p>
  <fieldset>
    <legend>Type:</legend>
    <label>
      <label>
        <input type="checkbox" value="solo" bind:group={partneredFilter} />
        Solo
      </label>
      <input type="checkbox" value="partnered" bind:group={partneredFilter} />
      Partnered
    </label>
  </fieldset>
  <fieldset>
    <legend> Categories: </legend>
    <label>
      <input
        type="checkbox"
        value={CATEGORY.Enum.kink}
        bind:group={categoryFilter}
      />
      Kink
    </label>
    <label>
      <input
        type="checkbox"
        value={CATEGORY.Enum.sex}
        bind:group={categoryFilter}
      />
      Sex
    </label>
    <label>
      <input
        type="checkbox"
        value={CATEGORY.Enum.foreplay}
        bind:group={categoryFilter}
      />
      Foreplay
    </label>
    <label>
      <input
        type="checkbox"
        value={CATEGORY.Enum.flirty}
        bind:group={categoryFilter}
      />
      Flirty
    </label>
    <label>
      <input
        type="checkbox"
        value={CATEGORY.Enum.truth}
        bind:group={categoryFilter}
      />
      Truth
    </label>
    {#if loggedIn}
      <label>
        <input
          type="checkbox"
          value={CATEGORY.Enum.unsorted}
          bind:group={categoryFilter}
        />
        Unsorted
      </label>
    {/if}
  </fieldset>
  <fieldset>
    <legend> Minimum Interaction Required: </legend>
    <label>
      <input
        type="checkbox"
        value={INTERACTION.enum.unmasked}
        bind:group={interactionFilter}
      />
      Unmasked
    </label>
    <label>
      <input
        type="checkbox"
        value={INTERACTION.enum.physical}
        bind:group={interactionFilter}
      />
      Physical
    </label>
    <label>
      <input
        type="checkbox"
        value={INTERACTION.enum.video}
        bind:group={interactionFilter}
      />
      Video
    </label>
    <label>
      <input
        type="checkbox"
        value={INTERACTION.enum.audio}
        bind:group={interactionFilter}
      />
      Audio
    </label>
    <label>
      <input
        type="checkbox"
        value={INTERACTION.enum.chat}
        bind:group={interactionFilter}
      />
      Chat
    </label>
    {#if loggedIn}
      <label>
        <input
          type="checkbox"
          value={INTERACTION.enum.unsorted}
          bind:group={interactionFilter}
        />
        Unsorted
      </label>
    {/if}
  </fieldset>
  {#if loggedIn}
    <fieldset>
      <legend>Status:</legend>
      <label>
        <input
          type="checkbox"
          value={DARE_STATUS.enum.public}
          bind:group={statusFilter}
        />
        Public
      </label>
      <label>
        <input
          type="checkbox"
          value={DARE_STATUS.enum.private}
          bind:group={statusFilter}
        />
        Private
      </label>
      <label>
        <input
          type="checkbox"
          value={DARE_STATUS.enum.pending}
          bind:group={statusFilter}
        />
        Pending
      </label>
      {#if admin}
        <label>
          <input
            type="checkbox"
            value={DARE_STATUS.enum.disabled}
            bind:group={statusFilter}
          />
          Disabled
        </label>
      {/if}
    </fieldset>
  {/if}
{/if}
<ul>
  {#each filteredDares as dare (dare.dareId)}
    <li><slot {dare} /></li>
  {/each}
</ul>
