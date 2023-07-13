<script lang="ts">
  export let disabled: boolean = false;
  export let loading: boolean = false;
  export let className: string = "";
  export let title: string = "";
  export let name: string = "";
  export let value: string | undefined = undefined;
  export let form: string | undefined = undefined;
  export let type: "button" | "submit" | "reset" | null | undefined = undefined;
  export let formaction: string | undefined = undefined;
</script>

<button
  class={className}
  {title}
  {disabled}
  {name}
  {formaction}
  {form}
  {type}
  {value}
  on:click
>
  <slot />
  {#if loading}
    <span>...</span>
  {/if}
</button>

<style>
  button {
    border-radius: 1rem;
    background-color: var(--btn-bg-color, var(--pop-color));
    color: var(--background-color);
    padding: 0.3rem 0.75rem;
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
