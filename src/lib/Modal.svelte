<script lang="ts">
  export let modal: HTMLDialogElement;
  export let className: string = "";
</script>

<dialog class={className} bind:this={modal} on:close on:cancel>
  <div class="scroll">
    <slot />
  </div>
</dialog>

<style>
  dialog {
    overflow: hidden;
    background-color: var(--background-color);
    margin: auto;
    width: calc(100% - 16px);
    max-width: 1000px;
    border-radius: var(--border-radius-large);
    border: 1px solid var(--accent-color);
    box-shadow: 0px 0px 20px 0px var(--accent-color) inset;
    overflow: hidden;
    &::backdrop {
      background-color: hsla(216, 37%, 8%, 0.4);
    }
    & > * {
      margin-block-end: 1rem;
    }
  }

  .scroll {
    padding: 8px;
    max-height: calc(100dvh - 96px);
    overflow: auto;
  }
</style>
