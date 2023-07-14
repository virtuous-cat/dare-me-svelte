<script lang="ts">
  import type { z } from "zod";

  export let label: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let value: string;
  export let disabled: boolean = false;
  export let schema: z.KeySchema;
  export let warnings = [""];
  function checkValue() {
    const parsedValue = schema.safeParse(value);
    warnings = parsedValue.success ? [""] : parsedValue.error.format()._errors;
  }
</script>

<div>
  {#if label}
    <label for="input">{label}</label>
  {/if}
  <input
    id="input"
    {name}
    type="text"
    bind:value
    {disabled}
    aria-label={ariaLabel}
    on:input={() => {
      if (warnings[0]) {
        checkValue();
      }
    }}
    on:keydown
  />
</div>
<div class="warnings">
  {#each warnings as warning}
    <small class="alert">{warning}</small>
  {/each}
</div>

<style>
  label {
    font-weight: 700;
    color: var(--text-color);
    margin-inline-end: 0.5rem;
  }
  .warnings {
    display: flex;
    flex-direction: column;
  }
  small {
    margin-block-end: 0.25rem;
  }
</style>
