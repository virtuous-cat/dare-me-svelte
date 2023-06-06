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
  import Button from "./Button.svelte";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  export let filterable: boolean = false;
  export let loggedIn: boolean = false;
  export let admin: boolean = false;
  export let dares: {
    dare: DareWithChildren;
    selected: boolean;
    editable: boolean;
    withNewVariant: boolean;
    saving: boolean;
    editingVariantId: string;
    savingVariant: boolean;
    selectedVariants: string[];
  }[] = [];

  const tagFilter = getContext<Writable<string[]>>("filteredTags");

  let categoryFilter: Category[] = [];
  let interactionFilter: Interaction[] = [];
  let statusFilter: DareStatus[] = [];
  let partneredFilter: ("partnered" | "solo")[] = [];
  let search: string = "";

  function checkDare(dare: DareWithChildren) {
    console.log("categories", categoryFilter);
    console.log("interactions", interactionFilter);
    console.log("statuses", statusFilter);
    console.log("partnered", partneredFilter);
    console.log("search", search);
    console.log("tags", $tagFilter);
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
    const tagFilterFound =
      !$tagFilter.length ||
      $tagFilter.every(
        (tag) => !!dare.tags.filter((dareTag) => dareTag.name === tag).length
      )
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
      partneredFound &&
      tagFilterFound
    );
  }

  $: filtered = !!(
    categoryFilter.length ||
    interactionFilter.length ||
    statusFilter.length ||
    search ||
    $tagFilter.length ||
    partneredFilter.length === 1
  );

  $: filteredDares = !(
    categoryFilter.length ||
    interactionFilter.length ||
    statusFilter.length ||
    search ||
    $tagFilter.length ||
    partneredFilter.length === 1
  )
    ? dares
    : dares.filter((statefulDare) => {
        if (!statefulDare.dare.children.length) {
          return checkDare(statefulDare.dare);
        }
        return (
          !!statefulDare.dare.children.filter(checkDare).length ||
          checkDare(statefulDare.dare)
        );
      });
</script>

{#if filterable}
  <section aria-controls="dare-list">
    <TextInput
      bind:value={search}
      schema={z.string()}
      label="Search:"
      name="search"
    />
    search value: {search}
    filtered tags:
    {#each $tagFilter as tag}{tag + ", "}{/each}
    <div>
      <h3>Filter:</h3>
      filtered: {filtered.toString()}
      <Button
        on:click={() => {
          categoryFilter = [];
          interactionFilter = [];
          statusFilter = [];
          partneredFilter = [];
        }}>Clear Filters</Button
      >
    </div>
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
    partnered filter:
    {#each partneredFilter as filter}{filter + ", "}{/each}
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
    category filter:
    {#each categoryFilter as filter}{filter + ", "}{/each}
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
    interaction filter:
    {#each interactionFilter as filter}{filter + ", "}{/each}
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
      status filter:
      {#each statusFilter as filter}{filter + ", "}{/each}
    {/if}
    {#if admin}
      <slot name="controls" {filteredDares} />
    {/if}
  </section>
{/if}
<ul aria-label="Dares" id="dare-list">
  {#each filteredDares as statefulDare (statefulDare.dare.dareId)}
    <li>
      <slot
        dare={statefulDare}
        expand={filtered && !checkDare(statefulDare.dare)}
      />
    </li>
  {/each}
</ul>
