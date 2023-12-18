<script lang="ts">
  import type { DareWithChildren, GameDare } from "./db.types";
  import Button from "./Button.svelte";
  import NewDare from "./NewDare.svelte";
  import { createEventDispatcher, getContext } from "svelte";
  import type { Writable } from "svelte/store";
  import { slide } from "svelte/transition";

  export let dare: GameDare;
  export let withDetails: boolean = false;
  let hidden: boolean = true;
  let width: number;
</script>

<svelte:window bind:innerWidth={width} />

<div class="wrapper">
  <div class="grid" class:withDetails>
    <p class="text">{dare?.dareText}</p>
    {#if withDetails}
      <div class="inner">
        {#if !hidden || width >= 700}
          <div class="details" transition:slide>
            <p><strong>{dare?.partnered ? "Partnered" : "Solo"}</strong></p>
            {#if dare?.timer}
              <p>
                <strong>Timer:</strong>
                {dare?.timer / 60000 >= 1
                  ? `${dare?.timer / 60000} min`
                  : `${dare?.timer / 1000} sec`}
              </p>
            {/if}
          </div>
        {/if}
        <div class="show">
          <div class="narrow">
            <Button
              on:click={() => {
                hidden = !hidden;
              }}>{!hidden ? "Hide Details" : "Show Details"}</Button
            >
          </div>
        </div>
      </div>
    {/if}
    <div class="buttons"><slot name="buttons" /></div>
  </div>
</div>

<style>
  .narrow {
    @media (min-width: 700px) {
      display: none;
    }
  }
  .details {
    display: flex;
    flex-wrap: wrap;
    column-gap: 1rem;
    row-gap: 0.5rem;
    margin-block-end: 0.75rem;
    @media (min-width: 700px) {
      margin-block-end: 0;
    }
  }

  .wrapper {
    flex-grow: 1;
    border: 2px solid var(--background-color);
    border-radius: var(--border-radius-med);
    padding: 8px;
  }
  .grid {
    display: grid;
    column-gap: 4px;
    grid-template-columns: auto;
    grid-template-rows: repeat(2, auto);
    grid-template-areas:
      "text"
      "buttons";
    @media (min-width: 600px) {
      grid-template-columns: 1fr auto;
      grid-template-rows: auto;
      grid-template-areas: "text buttons";
    }
  }
  .grid .withDetails {
    grid-template-columns: 1fr auto;
    grid-template-rows: repeat(2, auto);
    grid-template-areas:
      "text text"
      "inner buttons";
    @media (min-width: 500px) {
      grid-template-areas:
        "text buttons"
        "inner buttons";
    }
  }
  .inner {
    grid-area: inner;
    margin-block-start: 12px;
  }
  .text {
    grid-area: text;
    align-self: center;
  }
  .show {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.5rem;
    row-gap: 0.5rem;
  }
  .show :global(.show-variants) {
    @media (min-width: 700px) {
      margin-block-start: 0.5rem;
    }
  }
  .buttons {
    grid-area: buttons;
    align-self: end;
    display: flex;
    flex-wrap: wrap;
    row-gap: 0.75rem;
    column-gap: 0.5rem;
    justify-content: flex-end;
    align-items: flex-end;
    /* & > :last-child {
      margin-inline-start: 0.25rem;
    } */
  }
</style>
