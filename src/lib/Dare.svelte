<script lang="ts">
  import { children } from "svelte/internal";
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

  export let dare: DareWithChildren | null = null;
  export let loggedIn: boolean = false;
  export let admin: boolean = false;
  export let editable: boolean = false;
  export let withVariants: boolean = false;
  export let withDetails: boolean = false;

  let newDareText = dare?.dareText ?? "";
  let newDarePartnered: boolean = dare ? dare.partnered : true;
  let newDareStatus: DareStatus = admin
    ? DARE_STATUS.enum.public
    : DARE_STATUS.enum.pending;
  let newDareCategory: Category = dare?.category ?? CATEGORY.enum.unsorted;
  let newDareInteraction: Interaction =
    dare?.minInteraction ?? INTERACTION.enum.unsorted;
  const timerMap = [
    ["none", 0],
    ["30 sec", 30000],
    ["1 min", 60000],
    ["2 min", 120000],
    ["3 min", 180000],
    ["5 min", 300000],
    ["10 min", 600000],
  ];
  let newDareTimer = dare?.timer ?? 0;
  let newDareTags = dare?.tags ? dare.tags.map((tag) => tag.name) : [];
  let newTag: string = "";
  let tagWarnings = [""];

  let showVariants: boolean = false;

  //TODO: dispatch event on save and cancel
</script>

{#if editable}
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
                  newDareTags = newDareTags.filter(
                    (listTag) => listTag !== tag
                  );
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
          on:click={() => {
            if (window.confirm("Discard changes?")) {
              editable = false;
            }
          }}>Cancel</Button
        >
        <Button>Save</Button>
      </div>
    </div>
  </div>
{:else}
  <div class="wrapper">
    <div class="grid">
      <p>{dare?.dareText}</p>
      {#if withDetails}
        <div class="details">
          {#if withVariants && dare?.children.length}
            <Button
              on:click={() => {
                showVariants = !showVariants;
              }}>{showVariants ? "Hide Variants" : "Show Variants"}</Button
            >
          {/if}
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
                <li>{tag.name}</li>
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
          <svelte:self dare={variant}
            ><slot name="variant-buttons" slot="buttons" /></svelte:self
          >
        {/each}
      </ul>
    {/if}
  </div>
{/if}
