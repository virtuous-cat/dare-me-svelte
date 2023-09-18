<script lang="ts">
  import { enhance } from "$app/forms";
  import Button from "$lib/Button.svelte";
  import { getContext, onMount } from "svelte";
  import type { Writable } from "svelte/store";
  import { fade } from "svelte/transition";

  console.log("(site) layout in");

  let logIn: string | null;

  onMount(() => {
    // TODO: Local storage hack for testing only, replace when there is actual auth
    logIn = localStorage.getItem("admin");
  });

  let loggingIn: boolean = false;
  let scroll: number;
  let screenHeight: number;

  const admin = getContext<Writable<boolean>>("admin");

  console.log("(site) layout in");
</script>

<svelte:window bind:scrollY={scroll} bind:innerHeight={screenHeight} />
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

{#if scroll > screenHeight / 2}
  <div class="top" transition:fade={{ duration: 200 }}>
    <Button
      title="Scroll to Top"
      on:click={() => {
        window.scrollTo(0, 0);
      }}>^</Button
    >
  </div>
{/if}

<style>
  header {
    display: flex;
    flex-wrap: wrap;
    min-height: 4.625rem;
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

  .top {
    position: fixed;
    bottom: 1.5rem;
    right: 1rem;

    @media (min-width: 700px) {
      bottom: 3rem;
      right: 4rem;
    }
  }
  .top :global(button) {
    outline: 3px solid var(--background-color);
    &:hover,
    &:focus-visible {
      outline: 3px solid var(--accent-color);
    }
  }
</style>
