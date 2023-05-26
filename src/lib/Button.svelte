<script lang="ts">
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let className: string = "";
</script>

<button class={className} {disabled} on:click>
  <slot />
  {#if loading}
    <span>...</span>
  {/if}
</button>

<style>
  button {
    border-radius: 1rem;
    background-color: var(--bg-color, aquamarine);
  }
  button:disabled {
    background-color: hsl(180, 25%, 58%);
  }
</style>
