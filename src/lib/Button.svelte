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
    &:hover,
    &:focus-visible {
      outline: 3px solid var(--accent-color);
      box-shadow: -2px -2px 10px 1px hsl(345 80% 48%) inset;
    }
  }
  .inverted {
    background-color: hsl(266.9, 87.5%, 22%);
    color: var(--text-color);
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

  .icon-only {
    aspect-ratio: 1;
    padding: 8px;
    border-radius: 50%;
  }
  .with-icon {
    display: flex;
    gap: 8px;
    align-items: center;
  }
</style>
