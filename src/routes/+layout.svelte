<script lang="ts">
  import "@fontsource/modak";
  import { setContext } from "svelte";
  import { writable } from "svelte/store";
  import "$lib/globalstyles.css";

  console.log("routes layout in");

  const admin = writable<boolean>(false);
  setContext("admin", admin);

  console.log("routes layout out");
</script>

<slot />
