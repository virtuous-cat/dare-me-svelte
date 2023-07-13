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
    type StatefulDare,
  } from "./db.types";
  import Button from "./Button.svelte";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  export let filtered: boolean = false;
  export let loggedIn: boolean = false;
  export let admin: boolean = false;
  export let dares: DareWithChildren[] = [];

  const filteredDares = getContext<Writable<StatefulDare[]>>("filteredDares");
  const selectedParentIds = getContext<Writable<string[]>>("selectedParentIds");
  const allSelectedVariantIds = getContext<Writable<string[]>>(
    "allSelectedVariantIds"
  );

  const tagFilter = getContext<Writable<string[]>>("filteredTags");

  let categoryFilter: Category[] = [];
  let interactionFilter: Interaction[] = [];
  let statusFilter: DareStatus[] = [];
  let partneredFilter: ("partnered" | "solo")[] = [];
  let search: string = "";

  function checkDare(dare: DareWithChildren) {
    // console.log("categories", categoryFilter);
    // console.log("interactions", interactionFilter);
    // console.log("statuses", statusFilter);
    // console.log("partnered", partneredFilter);
    // console.log("search", search);
    // console.log("tags", $tagFilter);
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

  let topLevelFiltered: StatefulDare[] = [];
  let filteredVariantIds: string[] = [];

  $: {
    // This console log is ensuring updates run when filters change, do not delete
    console.log(
      "making stateful dares, filtered",
      !!(
        categoryFilter.length ||
        interactionFilter.length ||
        statusFilter.length ||
        search ||
        $tagFilter.length ||
        partneredFilter.length === 1
      )
    );
    topLevelFiltered = [];
    filteredVariantIds = [];
    for (const dare of dares) {
      const selectedVariantIds: string[] = [];
      let filteredChildren = dare.children.filter(checkDare);
      if ($allSelectedVariantIds.length && filteredChildren.length) {
        for (const variant of filteredChildren) {
          filteredVariantIds = [...filteredVariantIds, variant.dareId];
          if ($allSelectedVariantIds.includes(variant.dareId)) {
            selectedVariantIds.push(variant.dareId);
          }
        }
      }

      if (checkDare(dare)) {
        const statefulDare = {
          dare: { ...dare, children: filteredChildren },
          selected: $selectedParentIds.includes(dare.dareId),
          editable: false,
          withNewVariant: false,
          saving: false,
          editingVariantId: "",
          savingVariant: false,
          selectedVariants: selectedVariantIds,
        };
        topLevelFiltered = [...topLevelFiltered, statefulDare];
      } else if (filteredChildren.length) {
        const statefulVariants = filteredChildren.map((variant) => {
          return {
            dare: variant,
            selected: selectedVariantIds.includes(variant.dareId),
            editable: false,
            withNewVariant: false,
            saving: false,
            editingVariantId: "",
            savingVariant: false,
            selectedVariants: [],
          };
        });
        topLevelFiltered = [...topLevelFiltered, ...statefulVariants];
      }
    }
    $selectedParentIds = $selectedParentIds.filter((id) =>
      topLevelFiltered.some(({ dare }) => dare.dareId === id)
    );
    $allSelectedVariantIds = $allSelectedVariantIds.filter((id) =>
      filteredVariantIds.includes(id)
    );
  }

  $: {
    $filteredDares = topLevelFiltered;
    // console.log("filteredDares updated", $filteredDares);
  }
</script>

<section aria-controls="dare-list">
  <TextInput
    bind:value={search}
    schema={z.string()}
    label="Search:"
    name="search"
  />
  {#if search}
    <Button on:click={() => (search = "")}>Clear Search</Button>
  {/if}
  <h3 id="tags-label">Filtered By Tag{$tagFilter.length > 1 ? "s" : ""}:</h3>
  {#if !$tagFilter.length}
    <div aria-labelledby="tags-label">None</div>
  {:else}
    <ul class="tags" aria-labelledby="tags-label">
      {#each $tagFilter as tag (tag)}
        <li>
          <button
            class="tag"
            on:click={() => {
              if ($tagFilter.includes(tag)) {
                $tagFilter = $tagFilter.filter(
                  (filterTag) => filterTag !== tag
                );
                return;
              }
              $tagFilter = [...$tagFilter, tag];
            }}
          >
            {tag}
          </button>
        </li>
      {/each}
    </ul>
    <Button on:click={() => ($tagFilter = [])}>Clear Tag Filters</Button>
  {/if}
  <div>
    <h3>Filter:</h3>
    <!-- filtered: {filtered.toString()} -->
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
  <!-- partnered filter:
  {#each partneredFilter as filter}{filter + ", "}{/each} -->
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
  <!-- category filter:
  {#each categoryFilter as filter}{filter + ", "}{/each} -->
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
  <!-- interaction filter:
  {#each interactionFilter as filter}{filter + ", "}{/each} -->
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
    <!-- status filter:
    {#each statusFilter as filter}{filter + ", "}{/each} -->
  {/if}
  {#if admin}
    <slot name="controls" />
  {/if}
</section>
