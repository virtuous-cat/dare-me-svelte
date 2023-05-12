<script lang="ts">
  export let modal: HTMLDialogElement;
</script>

<dialog bind:this={modal} on:close>
  <slot />
</dialog>

<style>
  dialog {
    background-color: blueviolet;
  }
</style>
