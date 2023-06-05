<script lang="ts">
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let className: string = "";
  export let title: string = "";
</script>

<button class={className} {title} {disabled} on:click>
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
  .success {
    background-color: rgb(15, 137, 15);
  }
  .error {
    background-color: rgb(184, 44, 44);
  }
</style>
