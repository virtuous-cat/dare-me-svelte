<script lang="ts">
  import Button from "./Button.svelte";
  import TextInput from "./TextInput.svelte";
  import { TagSchema } from "./db.types";

  export let tags: string[] = [];
  export let label: string = "Tags:";

  let newTag: string = "";
  let tagWarnings: string[] = [""];
</script>

<div class="tags-list-wrapper">
  <strong id="tags-label">{label}</strong>
  <ul class="tags" aria-labelledby="tags-label">
    {#each tags as tag (tag)}
      <li>
        {tag}<button
          class="delete"
          aria-label="delete tag"
          title="Delete tag"
          on:click|preventDefault={() => {
            tags = tags.filter((listTag) => listTag !== tag);
          }}>x</button
        >
      </li>
    {/each}
  </ul>
</div>
<div class="input-group">
  <TextInput
    name="new-tag"
    bind:value={newTag}
    schema={TagSchema.shape.name}
    ariaLabel="Add new tag"
    hideWarnings
    warnings={tagWarnings}
    on:keydown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const parsedTag = TagSchema.shape.name.safeParse(newTag);
        if (!parsedTag.success) {
          tagWarnings = parsedTag.error.format()._errors;
          return;
        }
        if (!tags.includes(parsedTag.data)) {
          tags = [...tags, parsedTag.data];
        }
        newTag = "";
      }
    }}
  />
  <Button
    on:click={() => {
      if (!newTag) {
        return;
      }
      const parsedTag = TagSchema.shape.name.safeParse(newTag);
      if (!parsedTag.success) {
        tagWarnings = parsedTag.error.format()._errors;
        return;
      }
      if (!tags.includes(parsedTag.data)) {
        tags = [...tags, parsedTag.data];
      }
      newTag = "";
    }}>Add</Button
  >
</div>

<style>
  :global(.tags-list-wrapper) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    min-height: 1.75rem;
  }
  :global(.tags) {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  :global(.tags > li) {
    background-color: var(--btn-bg-color, var(--pop-color));
    color: var(--background-color);
    border-radius: 0.25rem;
    display: flex;
    gap: 0.25rem;
    padding-inline: 0.25rem;
    padding-block-end: 0.125rem;
    & .delete {
      background-color: inherit;
      color: var(--accent-color);
      border-radius: 50%;
      line-height: 0.1;
    }
  }
  .tags-list-wrapper {
    margin-block-end: 0.5rem;
  }
  .input-group {
    display: flex;
    gap: 8px;
  }
</style>
