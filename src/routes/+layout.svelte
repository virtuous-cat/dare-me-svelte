<script lang="ts">
  import "@fontsource/modak";
  import { setContext } from "svelte";
  import { writable } from "svelte/store";

  console.log("routes layout in");

  const admin = writable<boolean>(false);
  setContext("admin", admin);

  console.log("routes layout out");
</script>

<slot />

<style>
  :global(body) {
    font-family: Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans",
      source-sans-pro, sans-serif;

    scroll-behavior: smooth;
  }
  :global(.logo-font) {
    font-family: "Modak", Seravek, "Gill Sans Nova", Ubuntu, Calibri,
      "DejaVu Sans", source-sans-pro, sans-serif;
  }
</style>
