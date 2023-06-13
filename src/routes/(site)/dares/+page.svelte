<script lang="ts">
  import { enhance } from "$app/forms";
  import { invalidate } from "$app/navigation";
  import Button from "$lib/Button.svelte";
  import Dare from "$lib/Dare.svelte";
  import DareList from "$lib/DareList.svelte";
  import NewDare, { getAllNewDares } from "$lib/NewDare.svelte";
  import TextInput from "$lib/TextInput.svelte";
  import {
    DareDbInputSchema,
    DareWithChildrenSchema,
    type DareWithChildren,
    type NewDareState,
    type Tag,
    DARE_STATUS,
    CATEGORY,
    INTERACTION,
    TagSchema,
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
  // const allSelected = writable<boolean>(false);
  // setContext("allSelected", allSelected);

  // TODO: make allSelected dependent such that
  //  allSelected = $filteredDares.every((dare) => {
  //   const topLevelSelected = $selectedParentIds.includes(dare.dare.dareId) || $allSelectedVariantIds.includes(dare.dare.dareId);
  //   if (!dare.dare.children.length) {
  //     return topLevelSelected;
  //   }
  //   const allChildrenSelected = dare.dare.children.every((variant) => $allSelectedVariantIds.includes(variant.dareId));
  //   return topLevelSelected && allChildrenSelected
  // })

  let editInProcess: boolean = false;
  let daresToAdd: NewDareState[] = [];
  let savedDares: DareWithChildren[] = [];
  let savedVariants: DareWithChildren[] = [];
  let newVariantParentId: string = "";
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
  // $: statefulDares = daresWithSavedVariants.map((dare) => {
  //   const selected: string[] = [];
  //   if ($allSelectedVariantIds.length && dare.children.length) {
  //     for (const variant of dare.children) {
  //       if ($allSelectedVariantIds.includes(variant.dareId)) {
  //         selected.push(variant.dareId);
  //       }
  //     }
  //   }
  //   return {
  //     dare: dare,
  //     selected: $selectedParentIds.includes(dare.dareId),
  //     editable: false,
  //     withNewVariant: false,
  //     saving: false,
  //     editingVariantId: "",
  //     savingVariant: false,
  //     selectedVariants: selected,
  //   };
  // });
  // $: console.log("statefulDares updated", statefulDares);

  let saveAllError: string = "";
  let savingAll: boolean = false;

  let filtered: boolean;

  // function confirmDiscard() {
  //   return window.confirm(
  //     "You are already editing a dare. Discard your changes?"
  //   );
  // }
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
  <h1>Dares</h1>
  <p>See what dares are already in the database, or submit your own.</p>
  <p>All new dares will be reviewed before being added to the public list.</p>
  <section>
    {#if daresToAdd.length}
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
                if (!$loggedIn) {
                  const dareAdded = await response.json();
                  savedDares = [...savedDares, dareAdded];
                  console.log("dare saved on client", dareAdded);
                }
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
            savedDares = [...savedDares, ...daresAdded];
          }
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
  <DareList
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
  </DareList>
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
                // filteredDare.selected = true;
                // if (
                //   $filteredDares.every(
                //     (dareToCheck) =>
                //       dareToCheck.selected &&
                //       dareToCheck.dare.children.length ===
                //         dareToCheck.selectedVariants.length
                //   )
                // ) {
                //   $allSelected = true;
                // }
              } else {
                // $allSelected = false;
                // filteredDare.selected = false;
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
            // filteredDare.selectedVariants = [
            //   ...filteredDare.selectedVariants,
            //   e.detail.variantId,
            // ];
            $allSelectedVariantIds = [
              ...$allSelectedVariantIds,
              e.detail.variantId,
            ];
            // if (
            //   $filteredDares.every(
            //     (dareToCheck) =>
            //       dareToCheck.selected &&
            //       dareToCheck.dare.children.length ===
            //         dareToCheck.selectedVariants.length
            //   )
            // ) {
            //   $allSelected = true;
            // }
          }}
          on:deselectVariant={(e) => {
            // $allSelected = false;
            // filteredDare.selectedVariants =
            //   filteredDare.selectedVariants.filter(
            //     (id) => id !== e.detail.variantId
            //   );
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
            console.log("dare to be updated", parsedDare.data.dareId);
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
            console.log("set saving to false", filteredDare.saving);
            editInProcess = false;
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
            !!filteredDare.editingVariantId ||
            !!filteredDare.selectedVariants.length}
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
              if (!$loggedIn) {
                const dareAdded = await response.json();
                savedVariants = [...savedVariants, dareAdded];
              }
              console.log("saved new variant");
              filteredDare.savingVariant = false;
              filteredDare.withNewVariant = false;
              editInProcess = false;
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
              <li class="alert">error</li>
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
