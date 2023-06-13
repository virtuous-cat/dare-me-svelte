<script lang="ts">
  import TextInput from "./TextInput.svelte";
  import { TagSchema } from "./db.types";

  export let tags: string[] = [];
  export let label: string = "Tags:";

  let newTag: string = "";
  let tagWarnings: string[] = [""];
</script>

<p>
  <strong id="tags-label">{label}</strong>
</p>
<ul class="tags" aria-labelledby="tags-label">
  {#each tags as tag (tag)}
    <li>
      {tag}<button
        aria-label="delete tag"
        title="Delete tag"
        on:click|preventDefault={() => {
          tags = tags.filter((listTag) => listTag !== tag);
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
