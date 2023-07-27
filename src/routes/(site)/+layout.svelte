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
  </nav>
  {#if logIn}
    <div class="login">
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
              if (typeof result.data?.admin === "boolean") {
                $admin = result.data?.admin;
              }
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
    </div>
  {/if}
</header>

<slot />

<style>
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 1.25rem;
    padding: 1rem 0.5rem;
    @media (min-width: 500px) {
      padding: 1.25rem 2rem;
    }
  }

  ul {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 1.25rem;
    /* @media (min-width: 500px) {
      flex-direction: row;
      gap: 1rem;
    } */
  }

  .login {
    @media (min-width: 320px) {
      margin-inline-start: auto;
    }
  }
</style>
