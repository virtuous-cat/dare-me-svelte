<script lang="ts">
  import type { z } from "zod";

  export let label: string | undefined = undefined;
  export let ariaLabel: string | undefined = undefined;
  export let name: string | undefined = undefined;
  export let value: string;
  export let disabled: boolean = false;
  export let schema: z.KeySchema | undefined = undefined;
  export let warnings = [""];
  function checkValue() {
    if (!schema) {
      return;
    }
    console.log("checkValue value", value);
    const parsedValue = schema.safeParse(value);
    warnings = parsedValue.success
      ? [""]
      : !value
        ? [`${label ?? ariaLabel}${label || ariaLabel ? " is " : ""}required`]
        : parsedValue.error.format()._errors;
  }
</script>

<div class="input">
  <div class="flex">
    {#if label}
      <label for="input">{label}</label>
    {/if}
    <input
      id="input"
      class:label
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
</div>

<style>
  .flex {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  label {
    font-weight: 700;
    color: var(--text-brighter);
    /* margin-inline-end: 0.5rem; */
  }
  /* .label {
    margin-block-start: 0.5rem;
  } */
  .warnings {
    display: flex;
    flex-direction: column;
    min-height: 1lh;
  }
  small {
    margin-block-end: 0.25rem;
  }
  input {
    max-width: 100%;
    min-width: 30px;
  }
</style>
