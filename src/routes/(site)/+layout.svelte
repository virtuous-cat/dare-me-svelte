<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/Button.svelte";
  import { getContext, onMount } from "svelte";
  import type { Writable } from "svelte/store";

  console.log("(site) layout in");

  let logIn: string | null;

  onMount(() => {
    // TODO: Local storage hack for testing only, replace when there is actual auth
    logIn = localStorage.getItem("admin");
  });

  let loggingIn: boolean = false;

  const admin = getContext<Writable<boolean>>("admin");

  console.log("(site) layout in");
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
        id="login"
        method="POST"
        action="/?/login"
        use:enhance={({ cancel }) => {
          console.log("in use:enhance");
          if (!logIn) {
            console.log("no logIn");
            cancel();
            return;
          }
          if ($admin) {
            console.log("logging out");
            $admin = false;
            cancel();
            return;
          }
          loggingIn = true;
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
      <Button
        loading={loggingIn}
        form="login"
        name="adminKey"
        value={logIn}
        on:click={() => console.log("log in clicked")}
        >{$admin ? "Log Out" : "Log In"}</Button
      >
    {/if}
  </nav>
</header>

<slot />
