<script lang="ts">
  import type { DareWithChildren } from "./db.types";
  import Button from "./Button.svelte";
  import NewDare from "./NewDare.svelte";
  import { createEventDispatcher, getContext } from "svelte";
  import type { Writable } from "svelte/store";
  import { slide } from "svelte/transition";

  export let dare: DareWithChildren | null = null;
  export let saving: boolean = false;
  export let loggedIn: boolean = false;
  export let admin: boolean = false;
  export let editable: boolean = false;
  export let withVariants: boolean = false;
  export let withDetails: boolean = false;
  export let expand: boolean = false;
  export let editingVariantId: string = "";
  export let savingVariant: boolean = false;
  export let selectableVariants: boolean = false;
  export let selectedVariants: string[] = [];
  export let markNewIds: string[] = [];
  const filteredTags = getContext<Writable<string[]>>("filteredTags");

  let hidden: boolean = true;
  let width: number;

  const dispatch = createEventDispatcher();
</script>

<svelte:window bind:innerWidth={width} />

{#if editable}
  <NewDare parentDare={dare} {admin} {loggedIn} {saving} on:save on:discard />
{:else}
  <div class="wrapper">
    <div class="grid">
      <p class="text">{dare?.dareText}</p>
      <div class="inner">
        {#if withDetails}
          {#if !hidden || width >= 700}
            <div class="details" transition:slide>
              <p><strong>{dare?.partnered ? "Partnered" : "Solo"}</strong></p>
              {#if loggedIn}
                <p><strong>Status:</strong> {dare?.status}</p>
              {/if}
              <p><strong>Category:</strong> {dare?.category}</p>
              <p>
                <strong>Minimum Interaction:</strong>
                {dare?.minInteraction}
              </p>
              {#if dare?.timer}
                <p>
                  <strong>Timer:</strong>
                  {dare?.timer / 60000 >= 1
                    ? `${dare?.timer / 60000} min`
                    : `${dare?.timer / 1000} sec`}
                </p>
              {/if}
              <div class="tags-list-wrapper">
                <strong id="tags-label">Tags:</strong>{dare?.tags.length
                  ? ""
                  : "none"}
                {#if dare?.tags.length}
                  <ul class="tags" aria-labelledby="tags-label">
                    {#each dare.tags as tag (tag.id)}
                      <li>
                        <button
                          class="tag"
                          aria-pressed={$filteredTags.includes(tag.name)}
                          on:click={() => {
                            if ($filteredTags.includes(tag.name)) {
                              $filteredTags = $filteredTags.filter(
                                (filterTag) => filterTag !== tag.name
                              );
                              return;
                            }
                            $filteredTags = [...$filteredTags, tag.name];
                          }}
                        >
                          {tag.name}
                        </button>
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
            </div>
          {/if}
          <div class="show">
            <div class="narrow">
              <Button
                on:click={() => {
                  hidden = !hidden;
                }}>{!hidden ? "Hide Details" : "Show Details"}</Button
              >
            </div>
            {#if withVariants && dare?.children.length}
              <Button
                className="show-variants"
                on:click={() => {
                  expand = !expand;
                }}>{expand ? "Hide Variants" : "Show Variants"}</Button
              >
            {/if}
          </div>
        {/if}
      </div>
      <div class="buttons"><slot name="buttons" /></div>
    </div>
    {#if withVariants && expand && dare?.children.length}
      <ul class="variants" transition:slide>
        {#each dare.children as variant (variant.dareId)}
          <li
            class={variant.dareId && markNewIds.includes(variant.dareId)
              ? "new"
              : ""}
          >
            {#if admin && selectableVariants}
              <input
                type="checkbox"
                on:click={(e) => {
                  if (e.currentTarget.checked) {
                    dispatch("selectVariant", { variantId: variant.dareId });
                  } else {
                    dispatch("deselectVariant", { variantId: variant.dareId });
                  }
                }}
                checked={selectedVariants.includes(variant.dareId)}
              />
            {/if}
            <svelte:self
              dare={variant}
              editable={editingVariantId === variant.dareId}
              {admin}
              {loggedIn}
              saving={savingVariant}
              {withDetails}
              {markNewIds}
              on:discard={() =>
                dispatch("variantDiscard", { variantId: variant.dareId })}
              on:save={(e) => dispatch("variantSave", e.detail)}
              ><slot
                name="variant-buttons"
                variantId={variant.dareId}
                slot="buttons"
              /></svelte:self
            >
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{/if}

<style>
  .narrow {
    @media (min-width: 700px) {
      display: none;
    }
  }
  .details {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1rem;
    row-gap: 0.5rem;
    margin-block-end: 0.75rem;
    @media (min-width: 700px) {
      margin-block-end: 0;
    }
  }

  .tag {
    background-color: inherit;
    color: inherit;
  }
  .tag[aria-pressed="true"] {
    color: var(--accent-color);
  }

  .new {
    outline: 1px solid var(--pop-color);
  }

  .wrapper {
    flex-grow: 1;
  }
  .variants > li {
    margin-block-start: 1rem;
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 1rem;
    border-radius: var(--border-radius-small);
    border: 1px solid var(--accent-color);
    box-shadow: 0px 0px 20px 0px var(--accent-color) inset;
  }

  .grid {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: repeat(2, auto);
    grid-template-areas:
      "text text"
      "inner buttons";
    gap: 0.75rem;
  }
  .inner {
    grid-area: inner;
  }
  .text {
    grid-area: text;
  }
  .show {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.5rem;
    row-gap: 0.5rem;
  }
  .show :global(.show-variants) {
    @media (min-width: 700px) {
      margin-block-start: 0.5rem;
    }
  }
  .buttons {
    grid-area: buttons;
    align-self: end;
    display: flex;
    flex-wrap: wrap;
    row-gap: 0.75rem;
    column-gap: 0.5rem;
    justify-content: flex-end;
    /* & > :last-child {
      margin-inline-start: 0.25rem;
    } */
  }
</style>
