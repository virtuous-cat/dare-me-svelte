<script lang="ts">
  export let modal: HTMLDialogElement;
</script>

<dialog bind:this={modal} on:close on:cancel>
  <slot />
</dialog>

<style>
  dialog {
    background-color: var(--background-color);
    margin: auto 0.5rem;
    padding: 1.5rem;
    width: calc(100% - 1rem);
    max-width: 1000px;
    border-radius: var(--border-radius-large);
    border: 1px solid var(--accent-color);
    box-shadow: 0px 0px 20px 0px var(--accent-color) inset;
    @media (min-width: 1000px) {
      margin: auto;
    }
    &::backdrop {
      background-color: hsla(216, 37%, 8%, 0.4);
    }
    & > * {
      margin-block-end: 1rem;
    }
  }
</style>
