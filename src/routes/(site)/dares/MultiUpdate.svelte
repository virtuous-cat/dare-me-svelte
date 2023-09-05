<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/Button.svelte";
  import NewTagsBlock from "$lib/NewTagsBlock.svelte";
  import {
    DARE_STATUS,
    CATEGORY,
    INTERACTION,
    type StatefulDare,
  } from "$lib/db.types";
  import { getContext } from "svelte";
  import type { Writable } from "svelte/store";

  export let multiUpdateError: boolean = false;
  export let multiUpdateSuccess: boolean = false;

  const filteredDares = getContext<Writable<StatefulDare[]>>("filteredDares");
  const selectedParentIds = getContext<Writable<string[]>>("selectedParentIds");
  const allSelectedVariantIds = getContext<Writable<string[]>>(
    "allSelectedVariantIds"
  );

  $: allSelectedIds = [...$selectedParentIds, ...$allSelectedVariantIds];

  $: allSelected = $filteredDares.every((dare) => {
    const topLevelSelected = allSelectedIds.includes(dare.dare.dareId);
    if (!dare.dare.children.length) {
      return topLevelSelected;
    }
    const allChildrenSelected = dare.dare.children.every((variant) =>
      $allSelectedVariantIds.includes(variant.dareId)
    );
    return topLevelSelected && allChildrenSelected;
  });

  let updating: boolean = false;

  // let allVariantIds: string[] = [];

  let tags: string[] = [];
</script>

<div class="controls">
  <label>
    <input
      type="checkbox"
      checked={allSelected}
      on:click={(e) => {
        if (allSelected) {
          $selectedParentIds = [];
          $allSelectedVariantIds = [];
          return;
        }
        $selectedParentIds = [];
        $allSelectedVariantIds = [];
        for (const { dare } of $filteredDares) {
          if (dare.parentId) {
            $allSelectedVariantIds.push(dare.dareId);
          } else {
            $selectedParentIds.push(dare.dareId);
          }
          if (dare.children.length) {
            $allSelectedVariantIds.push(
              ...dare.children.map(({ dareId }) => dareId)
            );
          }
        }
        $allSelectedVariantIds = $allSelectedVariantIds;
        $selectedParentIds = $selectedParentIds;
      }}
    />
    <strong>Select All</strong>
  </label>
  <form
    method="POST"
    action="?/multiupdate"
    use:enhance={({ data, cancel }) => {
      if (!allSelectedIds.length) {
        cancel();
        return;
      }

      updating = true;
      for (const tag of tags) {
        data.append("tags", tag);
      }
      for (const id of allSelectedIds) {
        data.append("selectedIds", id);
      }
      return async ({ update }) => {
        update();
        updating = false;
        setTimeout(() => {
          multiUpdateError = false;
          multiUpdateSuccess = false;
        }, 3000);
      };
    }}
  >
    <div class="flex">
      <label>
        <strong>Type:</strong>
        <select name="partnered">
          <option value={null}>{""}</option>
          <option value={true}> Partnered </option>
          <option value={false}> Solo </option>
        </select>
      </label>
      <label
        ><strong>Status:</strong>
        <select name="status">
          <option value={null}>{""}</option>
          {#each DARE_STATUS.options as status}
            <option value={status}>
              {status}
            </option>
          {/each}
        </select>
      </label>
      <label
        ><strong>Category:</strong>
        <select name="category">
          <option value={null}>{""}</option>
          {#each CATEGORY.options as category}
            <option value={category}>
              {category}
            </option>
          {/each}
        </select>
      </label>
      <label
        ><strong>Minimum Interaction:</strong>
        <select name="minInteraction">
          <option value={null}>{""}</option>
          {#each INTERACTION.options as interaction}
            <option value={interaction}>
              {interaction}
            </option>
          {/each}
        </select>
      </label>
    </div>
    <NewTagsBlock bind:tags label="New Tags:" />
    <div class="btn">
      <Button
        loading={updating}
        className={multiUpdateSuccess
          ? "success"
          : multiUpdateError
          ? "error"
          : ""}>Update Selected</Button
      >
    </div>
  </form>
</div>

<style>
  .controls {
    margin-block-start: 1rem;
    border: 1px solid var(--accent-color);
    border-radius: calc(var(--border-radius-small) + 0.5rem);
    padding-inline: 1rem;
    padding-block-end: 1rem;
    padding-block-start: 0.75rem;
  }
  label {
    margin-block-end: 0.75rem;
    display: inline-block;
  }
  .flex {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1rem;
  }
  .btn {
    margin-block-start: 0.75rem;
  }
</style>
