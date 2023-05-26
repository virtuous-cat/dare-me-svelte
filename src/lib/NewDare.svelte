<script context="module" lang="ts">
  import type { DareDbInput } from "./db.types";

  let newDares: (DareDbInput & { remove?: boolean })[] = [];

  export function getAllNewDares() {
    return newDares.filter((dare) => !dare.remove);
  }
</script>

<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import {
    CATEGORY,
    DARE_STATUS,
    type Category,
    type DareStatus,
    type DareWithChildren,
    type Interaction,
    INTERACTION,
    TagSchema,
  } from "./db.types";
  import Button from "./Button.svelte";
  import TextInput from "./TextInput.svelte";

  export let parentDare: DareWithChildren | null = null;
  export let saving: boolean = false;
  export let loggedIn: boolean = false;
  export let admin: boolean = false;
  export let editing: boolean = false;

  let removeFromAll: boolean = false;
  let newDareText = parentDare?.dareText ?? "";
  let newDarePartnered: boolean = parentDare ? parentDare.partnered : true;
  let newDareStatus: DareStatus = admin
    ? DARE_STATUS.enum.public
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
  let newTag: string = "";
  let tagWarnings = [""];

  $: if (!editing) {
    newDares.push({
      remove: removeFromAll ? true : undefined,
      dareText: newDareText,
      status: newDareStatus,
      partnered: newDarePartnered,
      category: newDareCategory,
      minInteraction: newDareInteraction,
      timer: newDareTimer ?? null,
      tags: newDareTags,
      parentId: parentDare?.parentId
        ? parentDare.parentId
        : parentDare
        ? parentDare.dareId
        : null,
    });
  }

  const dispatch = createEventDispatcher();
</script>

<div class="wrapper">
  <div class="grid">
    <p contenteditable bind:textContent={newDareText} />
    <div class="details">
      <select bind:value={newDarePartnered}>
        <option value={true}> Partnered </option>
        <option value={false}> Solo </option>
      </select>
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
      <p>
        <strong id="tags-label">Tags:</strong>
      </p>
      <ul class="tags" aria-labelledby="tags-label">
        {#each newDareTags as tag (tag)}
          <li>
            {tag}<button
              aria-label="delete tag"
              title="Delete tag"
              on:click={() => {
                newDareTags = newDareTags.filter((listTag) => listTag !== tag);
              }}>x</button
            >
          </li>
        {/each}
      </ul>
      <TextInput
        name="new-tag"
        bind:value={newTag}
        schema={TagSchema.shape.name}
        ariaLabel="Add new tag"
        warnings={tagWarnings}
        on:keydown={(e) => {
          if (e.key === "Enter") {
            const parsedTag = TagSchema.shape.name.safeParse(newTag);
            if (!parsedTag.success) {
              tagWarnings = parsedTag.error.format()._errors;
              return;
            }
            if (!newDareTags.includes(parsedTag.data)) {
              newDareTags = [...newDareTags, parsedTag.data];
            }
            newTag = "";
          }
        }}
      />
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
    <div class="buttons">
      <Button
        disabled={saving}
        on:click={() => {
          if (window.confirm("Discard changes?")) {
            removeFromAll = true;
            dispatch("discard");
          }
        }}>Cancel</Button
      >
      <Button
        loading={saving}
        disabled={saving}
        on:click={() => {
          removeFromAll = true;
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
                : parentDare
                ? parentDare.dareId
                : null,
            },
          });
        }}>Save</Button
      >
    </div>
  </div>
</div>
