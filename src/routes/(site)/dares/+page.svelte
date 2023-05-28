<script lang="ts">
  import NewDare from "$lib/NewDare.svelte";
  import {
    DareDbInputSchema,
    type DareWithChildren,
    type NewDareState,
  } from "$lib/db.types";

  // TODO: load dares add admin hack

  let daresToAdd: NewDareState[] = [];
  let savedDares: DareWithChildren[] = [];
  $: allDares = [...savedDares];

  let inputErrors: string[] = [];
</script>

<main>
  <h1>Dares</h1>
  <p>See what dares are already in our database, or submit your own.</p>
  <p>All new dares will be reviewed before being added to the public list.</p>
  <section>
    {#if daresToAdd.length}
      <ul aria-label="dares to be submitted">
        {#each daresToAdd as dare}
          <li>
            <NewDare
              on:discard={() => {
                if (window.confirm("Discard this dare?")) {
                  dare.removed = true;
                  daresToAdd = daresToAdd.filter((dare) => !dare.removed);
                }
              }}
              on:save={async (e) => {
                dare.saving = true;
                const parsedDare = DareDbInputSchema.safeParse(
                  e.detail.newDare
                );
                if (!parsedDare.success) {
                  inputErrors = parsedDare.error.format()._errors;
                  dare.saving = false;
                  return;
                }
                const response = await fetch("/api/dares/new", {
                  method: "POST",
                  body: JSON.stringify(parsedDare.data),
                  headers: {
                    "Content-Type": "application/json",
                  },
                });
                const { dareAded } = await response.json();
                dare.saved = true;
                savedDares = [...savedDares, dareAded];
                dare.saving = false;
                daresToAdd = daresToAdd.filter((dare) => !dare.saved);
              }}
              saving={dare.saving}
              loggedIn
              admin
            />
            {#each inputErrors as error}
              <small class="alert">{error}</small>
            {/each}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</main>
