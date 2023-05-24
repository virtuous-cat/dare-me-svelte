<script lang="ts">
  import type { z } from "zod";

  export let label: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let name: string;
  export let value: string;
  export let disabled: boolean = false;
  export let schema: z.KeySchema;
  export let warnings = [""];
  function checkValue() {
    const parsedValue = schema.safeParse(value);
    warnings = parsedValue.success ? [""] : parsedValue.error.format()._errors;
  }
</script>

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
{#each warnings as warning}
  <small class="alert">{warning}</small>
{/each}
