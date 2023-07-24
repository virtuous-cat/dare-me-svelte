<script lang="ts">
  import { invalidate } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import Dare from "$lib/Dare.svelte";
  import DareListFilter from "$lib/DareListFilter.svelte";
  import NewDare, { getAllNewDares } from "$lib/NewDare.svelte";
  import {
    DareDbInputSchema,
    DareWithChildrenSchema,
    type DareWithChildren,
    type NewDareState,
    type StatefulDare,
  } from "$lib/db.types";
  import { nanoid } from "nanoid";
  import { getContext, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";
  import MultiUpdate from "./MultiUpdate.svelte";

  export let data;
  export let form;
  const admin = getContext<Writable<boolean>>("admin");
  const loggedIn = getContext<Writable<boolean>>("admin");

  const filteredTags = writable<string[]>([]);
  setContext("filteredTags", filteredTags);
  const filteredDares = writable<StatefulDare[]>([]);
  setContext("filteredDares", filteredDares);
  const selectedParentIds = writable<string[]>([]);
  setContext("selectedParentIds", selectedParentIds);
  const allSelectedVariantIds = writable<string[]>([]);
  setContext("allSelectedVariantIds", allSelectedVariantIds);

  let editInProcess: boolean = false;
  let daresToAdd: NewDareState[] = [];
  let savedDares: DareWithChildren[] = [];
  let savedVariants: DareWithChildren[] = [];
  let newVariantParentId: string = "";
  let markNewIds: string[] = [];
  let variantErrors: string[] = [];
  $: groupedVariants = savedVariants.reduce<Record<string, DareWithChildren[]>>(
    (byParentId, variant) => {
      if (!variant.parentId) {
        console.error("parentless variant", variant);
        const parentless = byParentId["noParent"] ?? [];
        return { ...byParentId, noParent: [...parentless, variant] };
      }
      const key = variant.parentId;
      const curGroup = byParentId[key] ?? [];
      return { ...byParentId, [key]: [...curGroup, variant] };
    },
    {}
  );
  $: allDares = [...savedDares, ...data.dares];
  $: daresWithSavedVariants = !savedVariants.length
    ? allDares
    : allDares.map((dare) => {
        if (Object.keys(groupedVariants).includes(dare.dareId)) {
          const newChildren = [
            ...dare.children,
            ...groupedVariants[dare.dareId],
          ];
          return { ...dare, children: newChildren };
        }
        return dare;
      });

  let saveAllError: string = "";
  let savingAll: boolean = false;

  let filtered: boolean;

  function maybeDiscardEditInProcess() {
    if (editInProcess) {
      if (
        !window.confirm("You are already editing a dare. Discard your changes?")
      ) {
        return;
      }
      const editingIndex = $filteredDares.findIndex(
        ({ editable, withNewVariant, editingVariantId }) =>
          editable || withNewVariant || !!editingVariantId
      );
      if (editingIndex > -1) {
        $filteredDares[editingIndex].editable = false;
        $filteredDares[editingIndex].withNewVariant = false;
        $filteredDares[editingIndex].editingVariantId = "";
      }
      editInProcess = false;
      variantErrors = [];
      newVariantParentId = "";
    }
  }
</script>

<main>
  <h1 class="logo-font">Dares</h1>
  <div class="intro">
    <p>See what dares are already in the database, or submit your own.</p>
    <p>All new dares will be reviewed before being added to the public list.</p>
  </div>
  <section class="new-dares">
    {#if daresToAdd.length}
      <h2>New Dares</h2>
      <ul aria-label="dares to be submitted">
        {#each daresToAdd as dare (dare.dareToAddId)}
          <li>
            <NewDare
              on:discard={() => {
                dare.removed = true;
                daresToAdd = daresToAdd.filter((dare) => !dare.removed);
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
                if (!$loggedIn) {
                  savedDares = [dareAdded, ...savedDares];
                  console.log("dare saved on client", dareAdded);
                }
                markNewIds = [dareAdded.dareId];
                dare.saved = true;
                dare.saving = false;
                daresToAdd = daresToAdd.filter((dare) => !dare.saved);
                invalidate("api/dares");
              }}
              saving={dare.saving}
              loggedIn={$loggedIn}
              admin={$admin}
              dareToAddId={dare.dareToAddId}
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
            {
              saved: false,
              saving: false,
              removed: false,
              errors: [],
              dareToAddId: nanoid(),
            },
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
          const newDaresMap = getAllNewDares();
          for (const key of newDaresMap.keys()) {
            if (!daresToAdd.some(({ dareToAddId }) => dareToAddId === key)) {
              newDaresMap.delete(key);
            }
          }
          const newDares = Array.from(newDaresMap);

          const response = await fetch("/api/dares", {
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
          const { daresAddedToDb, failedIds } = await response.json();
          const parsedReturned =
            DareWithChildrenSchema.array().safeParse(daresAddedToDb);
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
          if (!$loggedIn) {
            savedDares = [...daresAdded, ...savedDares];
          }
          markNewIds = [];
          daresAdded.forEach(
            ({ dareId }) => (markNewIds = [...markNewIds, dareId])
          );

          for (const dare of daresToAdd) {
            if (!failedIds.includes(dare.dareToAddId)) {
              dare.saved = true;
            }
            dare.saving = false;
          }
          daresToAdd = daresToAdd.filter((dare) => !dare.saved);
          if (failedIds.length) {
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
        className="new-button"
        on:click={() => {
          maybeDiscardEditInProcess();
          daresToAdd = [
            ...daresToAdd,
            {
              saved: false,
              saving: false,
              removed: false,
              errors: [],
              dareToAddId: nanoid(),
            },
          ];
        }}>Submit New Dares</Button
      >
    {/if}
  </section>
  <DareListFilter
    bind:filtered
    loggedIn={$loggedIn}
    admin={$admin}
    dares={daresWithSavedVariants}
  >
    <MultiUpdate
      slot="controls"
      multiUpdateError={!!form?.multiupdateError}
      multiUpdateSuccess={form?.success}
    />
  </DareListFilter>
  <ul id="dare-list">
    {#each $filteredDares as filteredDare (filteredDare.dare.dareId)}
      <li>
        {#if $admin}
          <input
            type="checkbox"
            checked={filteredDare.selected}
            on:click={(e) => {
              if (!filteredDare.selected) {
                if (filteredDare.dare.parentId) {
                  $allSelectedVariantIds = [
                    ...$allSelectedVariantIds,
                    filteredDare.dare.dareId,
                  ];
                } else {
                  $selectedParentIds = [
                    ...$selectedParentIds,
                    filteredDare.dare.dareId,
                  ];
                }
              } else {
                if (filteredDare.dare.parentId) {
                  $allSelectedVariantIds = $allSelectedVariantIds.filter(
                    (id) => id !== filteredDare.dare.dareId
                  );
                } else {
                  $selectedParentIds = $selectedParentIds.filter(
                    (id) => id !== filteredDare.dare.dareId
                  );
                }
              }
            }}
          />
        {/if}
        <Dare
          on:selectVariant={(e) => {
            $allSelectedVariantIds = [
              ...$allSelectedVariantIds,
              e.detail.variantId,
            ];
          }}
          on:deselectVariant={(e) => {
            $allSelectedVariantIds = $allSelectedVariantIds.filter(
              (id) => id !== e.detail.variantId
            );
          }}
          on:discard={() => {
            filteredDare.editable = false;
            editInProcess = false;
          }}
          on:variantDiscard={() => {
            filteredDare.editingVariantId = "";
            editInProcess = false;
          }}
          on:save={async (e) => {
            filteredDare.saving = true;
            variantErrors = [];
            const dareToUpdate = {
              ...e.detail.newDare,
              dareId: filteredDare.dare.dareId,
            };
            const parsedDare = DareDbInputSchema.safeParse(dareToUpdate);
            if (!parsedDare.success) {
              variantErrors = [...variantErrors, "Error saving dare."];
              filteredDare.saving = false;
              return;
            }
            const response = await fetch(
              `/api/dares/${parsedDare.data.dareId}`,
              {
                method: "PUT",
                body: JSON.stringify(parsedDare.data),
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
              }
            );
            if (!response.ok) {
              const error = await response.json();
              variantErrors = [...variantErrors, error.message];
              filteredDare.saving = false;
              return;
            }
            console.log("saved update to dare", parsedDare.data.dareId);
            filteredDare.saving = false;
            editInProcess = false;
            markNewIds = parsedDare.data.dareId ? [parsedDare.data.dareId] : [];
            filteredDare.editable = false;
            invalidate("api/dares");
          }}
          on:variantSave={async (e) => {
            filteredDare.savingVariant = true;
            variantErrors = [];
            const dareToUpdate = {
              ...e.detail.newDare,
              dareId: filteredDare.editingVariantId,
            };
            const parsedDare = DareDbInputSchema.safeParse(dareToUpdate);
            if (!parsedDare.success) {
              variantErrors = [...variantErrors, "Error saving dare."];
              filteredDare.savingVariant = false;
              return;
            }
            const response = await fetch(
              `/api/dares/${parsedDare.data.dareId}`,
              {
                method: "PUT",
                body: JSON.stringify(parsedDare.data),
                headers: {
                  "Content-Type": "application/json",
                  Accept: "application/json",
                },
              }
            );
            if (!response.ok) {
              const error = await response.json();
              variantErrors = [...variantErrors, error.message];
              filteredDare.savingVariant = false;
              return;
            }
            console.log("saved update to variant", parsedDare.data.dareId);
            filteredDare.savingVariant = false;
            filteredDare.editingVariantId = "";
            editInProcess = false;
            markNewIds = parsedDare.data.dareId ? [parsedDare.data.dareId] : [];
            invalidate("api/dares");
          }}
          dare={filteredDare.dare}
          admin={$admin}
          loggedIn={$loggedIn}
          editable={filteredDare.editable}
          saving={filteredDare.saving}
          editingVariantId={filteredDare.editingVariantId}
          savingVariant={filteredDare.savingVariant}
          selectableVariants
          selectedVariants={filteredDare.selectedVariants}
          expand={filtered ||
            filteredDare.withNewVariant ||
            !!filteredDare.editingVariantId ||
            !!filteredDare.selectedVariants.length ||
            filteredDare.dare.children.some((variant) =>
              markNewIds.includes(variant.dareId)
            )}
          {markNewIds}
          withDetails
          withVariants
        >
          <svelte:fragment slot="buttons">
            <Button
              title="Add Variant"
              on:click={() => {
                maybeDiscardEditInProcess();
                editInProcess = true;
                newVariantParentId = filteredDare.dare.dareId;
                filteredDare.withNewVariant = true;
              }}>+</Button
            >
            {#if $admin}
              <Button
                title="Edit"
                on:click={() => {
                  maybeDiscardEditInProcess();
                  editInProcess = true;
                  filteredDare.editable = true;
                }}>Edit</Button
              >
            {/if}
          </svelte:fragment>
          <svelte:fragment slot="variant-buttons" let:variantId>
            <Button
              title="Add Variant"
              on:click={() => {
                maybeDiscardEditInProcess();
                editInProcess = true;
                newVariantParentId = variantId;
                filteredDare.withNewVariant = true;
              }}>+</Button
            >
            {#if $admin}
              <Button
                title="Edit"
                on:click={() => {
                  maybeDiscardEditInProcess();
                  editInProcess = true;
                  filteredDare.editingVariantId = variantId;
                }}>Edit</Button
              >
            {/if}
          </svelte:fragment>
        </Dare>
        {#if filteredDare.withNewVariant}
          <NewDare
            on:discard={() => {
              variantErrors = [];
              filteredDare.withNewVariant = false;
              editInProcess = false;
            }}
            on:save={async (e) => {
              filteredDare.savingVariant = true;
              variantErrors = [];
              const parsedDare = DareDbInputSchema.safeParse(e.detail.newDare);
              if (!parsedDare.success) {
                variantErrors = [...variantErrors, "Error saving dare."];
                filteredDare.savingVariant = false;
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
                variantErrors = [...variantErrors, error.message];
                filteredDare.savingVariant = false;
                return;
              }
              const dareAdded = await response.json();
              if (!$loggedIn) {
                savedVariants = [...savedVariants, dareAdded];
              }
              console.log("saved new variant with parent", dareAdded.parentId);
              filteredDare.savingVariant = false;
              filteredDare.withNewVariant = false;
              editInProcess = false;
              markNewIds = [dareAdded.dareId];
              newVariantParentId = "";
              invalidate("api/dares");
            }}
            parentDare={newVariantParentId === filteredDare.dare.dareId
              ? filteredDare.dare
              : filteredDare.dare.children.find(
                  ({ dareId }) => dareId === newVariantParentId
                )}
            admin={$admin}
            loggedIn={$loggedIn}
            saving={filteredDare.savingVariant}
          />
        {/if}
        {#if variantErrors.length}
          <ul>
            {#each variantErrors as error}
              <li class="alert">{error}</li>
            {/each}
          </ul>
        {/if}
      </li>
    {/each}
    {#if !$filteredDares.length}
      <li>No Dares Found</li>
    {/if}
  </ul>
</main>

<style>
  main {
    max-width: 1000px;

    margin: 0 auto;
    & > * {
      margin-block-end: 1.25rem;
    }
  }
  h1 {
    font-size: 4.75rem;
    line-height: 1;
    color: var(--accent-color);
    margin: 1.5rem 0;
  }
  h1,
  .intro {
    text-align: center;
  }
  .new-dares {
    display: grid;
  }
  .new-dares :global(.new-button) {
    justify-self: center;
  }
</style>
