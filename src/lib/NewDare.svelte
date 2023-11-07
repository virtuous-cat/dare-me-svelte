<script context="module" lang="ts">
  import type { DareDbInput, DareWithTags } from "./db.types";

  let newDares = new Map<string, DareDbInput>();

  export function getAllNewDares() {
    return newDares;
  }
</script>

<script lang="ts">
  import { createEventDispatcher, onDestroy, onMount } from "svelte";
  import {
    CATEGORY,
    DARE_STATUS,
    type Category,
    type DareStatus,
    type DareWithChildren,
    type Interaction,
    INTERACTION,
  } from "./db.types";
  import Button from "./Button.svelte";
  import NewTagsBlock from "./NewTagsBlock.svelte";
  import { slide } from "svelte/transition";

  export let parentDare: DareWithChildren | DareWithTags | null = null;
  export let saving: boolean = false;
  export let loggedIn: boolean = false;
  export let admin: boolean = false;
  export let isNewVariant: boolean = false;
  export let dareToAddId: string = "";

  let textElement: HTMLParagraphElement;

  let newDareText = parentDare?.dareText ?? "";
  let newDarePartnered: boolean = parentDare ? parentDare.partnered : true;
  let newDareStatus: DareStatus = admin
    ? parentDare?.status ?? DARE_STATUS.enum.public
    : DARE_STATUS.enum.pending;
  let newDareCategory: Category =
    parentDare?.category ?? CATEGORY.enum.unsorted;
  let newDareInteraction: Interaction =
    parentDare?.minInteraction ?? INTERACTION.enum.unsorted;
  const timerMap = [
    ["none", 0],
    ["30 sec", 30000],
    ["1 min", 60000],
    ["2 min", 120000],
    ["3 min", 180000],
    ["5 min", 300000],
    ["10 min", 600000],
  ];
  let newDareTimer = parentDare?.timer ?? 0;
  let newDareTags = parentDare?.tags
    ? parentDare.tags.map((tag) => tag.name)
    : [];
  let noChange = false;

  $: if (noChange && newDareText !== parentDare?.dareText) {
    noChange = false;
  }

  $: if (
    dareToAddId.length &&
    newDareText.length &&
    !(parentDare && isNewVariant && newDareText === parentDare.dareText)
  ) {
    newDares.set(dareToAddId, {
      dareText: newDareText.trim(),
      status: newDareStatus,
      partnered: newDarePartnered,
      category: newDareCategory,
      minInteraction: newDareInteraction,
      timer: newDareTimer === 0 ? null : newDareTimer,
      tags: newDareTags,
      parentId: parentDare?.parentId
        ? parentDare.parentId
        : parentDare && isNewVariant
        ? parentDare.dareId
        : null,
    });
  }

  const dispatch = createEventDispatcher();

  onMount(() => {
    textElement.focus();
  });
  onDestroy(() => {
    if (dareToAddId.length) {
      newDares.delete(dareToAddId);
    }
  });
</script>

<div class="wrapper" transition:slide>
  <div class="text">
    <p
      contenteditable
      class="new-dare-text"
      bind:this={textElement}
      bind:textContent={newDareText}
    />
    {#if newDareText.trim().length > 700}
      <small class="alert" transition:slide
        >Dares may only contain upto 700 characters. Current count: {newDareText.trim()
          .length}</small
      >
    {/if}
    {#if noChange && isNewVariant}
      <small class="alert" transition:slide
        >Variants must have unique dare text.</small
      >
    {/if}
  </div>
  <div class="flex">
    <label>
      <strong>Type:</strong>
      <select bind:value={newDarePartnered}>
        <option value={true}> Partnered </option>
        <option value={false}> Solo </option>
      </select>
    </label>
    {#if loggedIn && admin}
      <label
        ><strong>Status:</strong>
        <select bind:value={newDareStatus}>
          {#each DARE_STATUS.options as status}
            <option value={status}>
              {status}
            </option>
          {/each}
        </select>
      </label>
    {/if}
    <label
      ><strong>Category:</strong>
      <select bind:value={newDareCategory}>
        {#each CATEGORY.options as category}
          <option value={category}>
            {category}
          </option>
        {/each}
      </select>
    </label>
    <label
      ><strong>Minimum Interaction:</strong>
      <select bind:value={newDareInteraction}>
        {#each INTERACTION.options as interaction}
          <option value={interaction}>
            {interaction}
          </option>
        {/each}
      </select>
    </label>
    <label
      ><strong>Timer:</strong>
      <select bind:value={newDareTimer}>
        {#each timerMap as time}
          <option value={time[1]}>
            {time[0]}
          </option>
        {/each}
      </select>
    </label>
  </div>
  <div class="tag-area">
    <NewTagsBlock bind:tags={newDareTags} />
  </div>
  <div class="buttons">
    <Button
      disabled={saving}
      on:click={() => {
        if (window.confirm("Discard changes to this dare?")) {
          newDares.delete(dareToAddId);
          dispatch("discard");
        }
      }}>Cancel</Button
    >
    <Button
      loading={saving}
      disabled={saving ||
        newDareText.trim().length > 700 ||
        newDareText.trim().length < 1}
      on:click={() => {
        if (parentDare && isNewVariant && newDareText === parentDare.dareText) {
          noChange = true;
          return;
        }
        newDares.delete(dareToAddId);
        dispatch("save", {
          newDare: {
            dareText: newDareText,
            status: newDareStatus,
            partnered: newDarePartnered,
            category: newDareCategory,
            minInteraction: newDareInteraction,
            timer: newDareTimer ?? null,
            tags: newDareTags,
            parentId: parentDare?.parentId
              ? parentDare.parentId
              : parentDare && isNewVariant
              ? parentDare.dareId
              : null,
          },
        });
      }}>Save</Button
    >
  </div>
</div>

<style>
  .new-dare-text {
    border-top: 2px solid hsl(345, 80%, 32%);
    border-left: 2px solid hsl(345, 80%, 32%);
    border-right: 2px solid var(--accent-color);
    border-bottom: 2px solid var(--accent-color);
  }

  .wrapper {
    flex-grow: 1;
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: repeat(4, auto);
    grid-template-areas:
      "text text"
      "details details"
      "tags tags"
      "buttons buttons";
    gap: 0.75rem;
    margin-block-start: 1rem;
    padding: 1rem;
    padding-inline-start: 1.25rem;
    border-radius: var(--border-radius-small);
    border: 1px solid var(--accent-color);
    box-shadow: 0px 0px 20px 0px var(--accent-color) inset;
    @media (min-width: 700px) {
      grid-template-rows: repeat(3, auto);
      grid-template-areas:
        "text text"
        "details details"
        "tags buttons";
    }
  }

  .text {
    grid-area: text;
  }

  .tag-area {
    grid-area: tags;
  }

  label {
    display: inline-block;
  }
  .flex {
    grid-area: details;
    display: flex;
    flex-wrap: wrap;
    column-gap: 1rem;
    row-gap: 0.75rem;
  }
  .buttons {
    grid-area: buttons;
    align-self: end;
    display: flex;
    flex-wrap: wrap;
    row-gap: 0.75rem;
    column-gap: 0.5rem;
    justify-content: flex-end;
  }
</style>
