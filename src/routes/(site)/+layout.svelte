<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/Button.svelte";
  import { getContext, onMount } from "svelte";
  import type { Writable } from "svelte/store";

  let logIn: string | null;

  onMount(() => {
    // TODO: Local storage hack for testing only, replace when there is actual auth
    logIn = localStorage.getItem("admin");
  });

  let loggingIn: boolean = false;

  const admin = getContext<Writable<boolean>>("admin");
</script>

<header>
  <nav>
    <ul>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
      <li><a href="/dares">Dares</a></li>
    </ul>
    {#if logIn}
      <form
        method="POST"
        action="/?/login"
        use:enhance={({ cancel, data }) => {
          if (!logIn) {
            cancel();
            return;
          }
          if ($admin) {
            $admin = false;
            cancel();
            return;
          }
          loggingIn = true;
          data.set("adminKey", logIn);
          return async ({ result, update }) => {
            if (result.type === "success") {
              $admin = result.data?.admin;
            } else if (result.type === "failure") {
              console.error(result.data?.loginError);
            }
            await update();
            loggingIn = false;
          };
        }}
      />
      <Button>{$admin ? "Log Out" : "Log In"}</Button>
    {/if}
  </nav>
</header>

<slot />
