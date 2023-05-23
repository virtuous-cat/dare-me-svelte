<script lang="ts">
  import "@fontsource/modak";
</script>

<slot />

<style>
  :global(body) {
    font-family: Seravek, "Gill Sans Nova", Ubuntu, Calibri, "DejaVu Sans",
      source-sans-pro, sans-serif;
  }
  :global(.logo-font) {
    font-family: "Modak", Seravek, "Gill Sans Nova", Ubuntu, Calibri,
      "DejaVu Sans", source-sans-pro, sans-serif;
  }
</style>
