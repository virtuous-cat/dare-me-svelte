<script lang="ts">
  import { invalidate } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import NewDare, { getAllNewDares } from "$lib/NewDare.svelte";
  import {
    DareDbInputSchema,
    DareWithChildrenSchema,
    type DareWithChildren,
    type NewDareState,
  } from "$lib/db.types";

  // TODO: load dares and add admin hack

  let daresToAdd: NewDareState[] = [];
  let savedDares: DareWithChildren[] = [];
  $: allDares = [...savedDares];

  let saveAllError: string = "";
  let savingAll: boolean = false;
</script>

<main>
  <h1>Dares</h1>
  <p>See what dares are already in the database, or submit your own.</p>
  <p>All new dares will be reviewed before being added to the public list.</p>
  <section>
    {#if daresToAdd.length}
      <ul aria-label="dares to be submitted">
        {#each daresToAdd as dare, i}
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
                dare.errors = [];
                const parsedDare = DareDbInputSchema.safeParse(
                  e.detail.newDare
                );
                if (!parsedDare.success) {
                  dare.errors = ["Error saving dare."];
                  dare.saving = false;
                  return;
                }
                const response = await fetch("/api/dares/new", {
                  method: "POST",
                  body: JSON.stringify(parsedDare.data),
                  headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                });
                if (!response.ok) {
                  const error = await response.json();
                  dare.errors = [...dare.errors, error.message];
                  dare.saving = false;
                  return;
                }
                const dareAdded = await response.json();
                dare.saved = true;
                savedDares = [...savedDares, dareAdded];
                dare.saving = false;
                daresToAdd = daresToAdd.filter((dare) => !dare.saved);
                invalidate("api/dares");
              }}
              saving={dare.saving}
              loggedIn
              admin
            />
            {#each dare.errors as error}
              <small class="alert">{error}</small>
            {/each}
          </li>
        {/each}
      </ul>
      <small class="alert">{saveAllError}</small>
      <Button
        on:click={() => {
          daresToAdd = [
            ...daresToAdd,
            { saved: false, saving: false, removed: false, errors: [] },
          ];
        }}>+</Button
      >
      <Button
        on:click={async () => {
          savingAll = true;
          saveAllError = "";
          for (const dare of daresToAdd) {
            dare.saving = true;
          }
          const newDares = getAllNewDares();
          const response = await fetch("/api/dares/new", {
            method: "POST",
            body: JSON.stringify(newDares),
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
          });
          if (!response.ok) {
            const error = await response.json();
            saveAllError = error.message;
            for (const dare of daresToAdd) {
              dare.saving = false;
            }
            savingAll = false;
            return;
          }
          const returned = await response.json();
          const parsedReturned =
            DareWithChildrenSchema.array().safeParse(returned);
          if (!parsedReturned.success) {
            console.error(parsedReturned.error.format());
            saveAllError = "Server error encountered while saving.";
            for (const dare of daresToAdd) {
              dare.saving = false;
            }
            savingAll = false;
            return;
          }
          const daresAdded = parsedReturned.data;

          const savedToDb =
            daresAdded.length === newDares.length
              ? newDares
              : newDares.filter((dare) => {
                  return daresAdded.some((addedDare) => {
                    return (
                      addedDare.dareText === dare.dareText &&
                      addedDare.partnered === dare.partnered &&
                      addedDare.status === dare.status &&
                      addedDare.minInteraction === dare.minInteraction &&
                      addedDare.category === dare.category &&
                      addedDare.timer === dare.timer &&
                      addedDare.tags.every((tag) =>
                        dare.tags?.includes(tag.name)
                      )
                    );
                  });
                });
          daresToAdd.forEach((dare, i) => {
            if (savedToDb.some((dare) => dare.listPosition === i)) {
              dare.saved = true;
            }
          });
          savedDares = [...savedDares, ...daresAdded];
          for (const dare of daresToAdd) {
            dare.saving = false;
          }
          daresToAdd = daresToAdd.filter((dare) => !dare.saved);
          if (daresToAdd.length) {
            saveAllError = `Error saving above dare${
              daresToAdd.length > 1 ? "s" : ""
            }, please try again.`;
          }
          savingAll = false;
          invalidate("api/dares");
        }}
        loading={savingAll}
        disabled={savingAll || daresToAdd.some((dare) => dare.saving)}
        >Save all</Button
      >
    {:else}
      <Button
        on:click={() => {
          daresToAdd = [
            ...daresToAdd,
            { saved: false, saving: false, removed: false, errors: [] },
          ];
        }}>Submit Dares</Button
      >
    {/if}
  </section>
</main>
