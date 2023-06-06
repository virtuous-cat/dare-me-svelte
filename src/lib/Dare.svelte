<script lang="ts">
  import type { DareWithChildren } from "./db.types";
  import Button from "./Button.svelte";
  import NewDare from "./NewDare.svelte";
  import { createEventDispatcher, getContext } from "svelte";
  import type { Writable } from "svelte/store";

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
  const filteredTags = getContext<Writable<string[]>>("filteredTags");

  let hidden: boolean = true;
  let showVariants: boolean = expand;

  const dispatch = createEventDispatcher();
</script>

{#if editable}
  <NewDare parentDare={dare} {admin} {loggedIn} {saving} on:save on:discard />
{:else}
  <div class="wrapper">
    <div class="grid">
      <p>{dare?.dareText}</p>
      {#if withDetails}
        <div class="narrow">
          <Button
            on:click={() => {
              hidden = !hidden;
            }}>{!hidden ? "Hide Details" : "Show Details"}</Button
          >
        </div>
        {#if withVariants && dare?.children.length}
          <Button
            on:click={() => {
              showVariants = !showVariants;
            }}>{showVariants ? "Hide Variants" : "Show Variants"}</Button
          >
        {/if}
        <div class="details" class:hidden>
          <p><strong>{dare?.partnered ? "Partnered" : "Solo"}</strong></p>
          {#if loggedIn}
            <p><strong>Status:</strong> {dare?.status}</p>
          {/if}
          <p><strong>Category:</strong> {dare?.category}</p>
          <p><strong>Minimum Interaction:</strong> {dare?.minInteraction}</p>
          <p>
            <strong id="tags-label">Tags:</strong>{dare?.tags.length
              ? ""
              : "none"}
          </p>
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
          {#if dare?.timer}
            <p>
              <strong>Timer:</strong>
              {dare?.timer / 60000 >= 1
                ? `${dare?.timer / 60000} min`
                : `${dare?.timer / 1000} sec`}
            </p>
          {/if}
        </div>
      {/if}
      <div class="buttons"><slot name="buttons" /></div>
    </div>
    {#if withVariants && showVariants && dare?.children.length}
      <ul class="variants">
        {#each dare.children as variant (variant.dareId)}
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
            on:discard={() =>
              dispatch("variantDiscard", { variantId: variant.dareId })}
            on:save={(e) => dispatch("variantSave", e.detail)}
            ><slot
              name="variant-buttons"
              variantId={variant.dareId}
              slot="buttons"
            /></svelte:self
          >
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
  .hidden {
    display: none;
    @media (min-width: 700px) {
      display: block;
    }
  }
  .tags [aria-pressed="true"] {
    background-color: darkcyan;
  }
</style>
