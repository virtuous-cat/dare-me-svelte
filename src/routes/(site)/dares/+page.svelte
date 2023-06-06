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
  } from "$lib/db.types";
  import { nanoid } from "nanoid";
  import { getContext, setContext } from "svelte";
  import { writable, type Writable } from "svelte/store";

  export let data;
  export let form;
  const admin = getContext<Writable<boolean>>("admin");
  const loggedIn = getContext<Writable<boolean>>("admin");

  let selectedParentIds: string[] = [];
  let allSelectedVariantIds: string[] = [];
  $: allSelectedIds = [...selectedParentIds, ...allSelectedVariantIds];
  let allSelected: boolean = false;
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
  $: statefulDares = daresWithSavedVariants.map((dare) => {
    const selected: string[] = [];
    if (allSelectedVariantIds.length && dare.children.length) {
      for (const variant of dare.children) {
        if (allSelectedVariantIds.includes(variant.dareId)) {
          selected.push(variant.dareId);
        }
      }
    }
    return {
      dare: dare,
      selected: false,
      editable: false,
      withNewVariant: false,
      saving: false,
      editingVariantId: "",
      savingVariant: false,
      selectedVariants: selected,
    };
  });

  let saveAllError: string = "";
  let savingAll: boolean = false;
  let allVariantIds: string[] = [];

  let updating: boolean = false;
  let multiupdateTags: string[] = [];
  let newTag: string = "";
  let tagWarnings: string[] = [];

  const filteredTags = writable<string[]>([]);
  setContext("filteredTags", filteredTags);

  function confirmDiscard() {
    return window.confirm(
      "You are already editing a dare. Discard your changes?"
    );
  }
  function maybeDiscardEditInProcess() {
    if (editInProcess) {
      if (
        !window.confirm("You are already editing a dare. Discard your changes?")
      ) {
        return;
      }
      const editing = statefulDares.find(
        ({ editable, withNewVariant, editingVariantId }) =>
          editable || withNewVariant || !!editingVariantId
      );
      if (editing) {
        editing.editable = false;
        editing.withNewVariant = false;
        editing.editingVariantId = "";
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
  <section>
    <DareList
      filterable
      loggedIn={$loggedIn}
      admin={$admin}
      dares={statefulDares}
    >
      <div slot="controls" let:filteredDares>
        <input
          type="checkbox"
          bind:checked={allSelected}
          on:click={(e) => {
            if (e.currentTarget.checked) {
              selectedParentIds = filteredDares.map(({ dare }) => dare.dareId);

              for (const { dare } of filteredDares) {
                if (dare.children.length) {
                  allVariantIds = [
                    ...allVariantIds,
                    ...dare.children.map((variant) => variant.dareId),
                  ];
                }
              }
              allSelectedVariantIds = allVariantIds;
            } else {
              selectedParentIds = [];
              allSelectedVariantIds = [];
            }
          }}
        />
        <form
          method="POST"
          action="?/multiupdate"
          use:enhance={({ data, cancel }) => {
            if (!allSelectedIds.length) {
              cancel();
              return;
            }
            updating = true;
            for (const tag of multiupdateTags) {
              data.append("tags", tag);
            }
            for (const id of allSelectedIds) {
              data.append("selectedIds", id);
            }
            return async ({ update }) => {
              update();
              updating = false;
            };
          }}
        >
          <label>
            <strong>Partnered:</strong>
            <select name="partnered">
              <option value={null}>{""}</option>
              <option value={true}> Partnered </option>
              <option value={false}> Solo </option>
            </select>
          </label>
          <label
            ><strong>Status:</strong>
            <select name="status">
              <option value={null}>{""}</option>

              {#each DARE_STATUS.options as status}
                <option value={status}>
                  {status}
                </option>
              {/each}
            </select>
          </label>
          <label
            ><strong>Category:</strong>
            <select name="category">
              <option value={null}>{""}</option>
              {#each CATEGORY.options as category}
                <option value={category}>
                  {category}
                </option>
              {/each}
            </select>
          </label>
          <label
            ><strong>Minimum Interaction:</strong>
            <select name="minInteraction">
              <option value={null}>{""}</option>
              {#each INTERACTION.options as interaction}
                <option value={interaction}>
                  {interaction}
                </option>
              {/each}
            </select>
          </label>
          <p>
            <strong id="update-tags-label">Add Tags:</strong>
          </p>
          <ul class="tags" aria-labelledby="update-tags-label">
            {#each multiupdateTags as tag (tag)}
              <li>
                {tag}<button
                  aria-label="delete tag"
                  title="Delete tag"
                  on:click={() => {
                    multiupdateTags = multiupdateTags.filter(
                      (listTag) => listTag !== tag
                    );
                  }}>x</button
                >
              </li>
            {/each}
          </ul>
          <TextInput
            name=""
            bind:value={newTag}
            schema={TagSchema.shape.name}
            ariaLabel="Add new tag"
            warnings={tagWarnings}
            on:keydown={(e) => {
              if (e.key === "Enter") {
                const parsedTag = TagSchema.shape.name.safeParse(newTag);
                if (!parsedTag.success) {
                  tagWarnings = parsedTag.error.format()._errors;
                  return;
                }
                if (!multiupdateTags.includes(parsedTag.data)) {
                  multiupdateTags = [...multiupdateTags, parsedTag.data];
                }
                newTag = "";
              }
            }}
          />
          <Button
            loading={updating}
            className={form?.success
              ? "success"
              : form?.multiupdateError
              ? "error"
              : ""}>Update Selected</Button
          >
        </form>
      </div>
      <svelte:fragment let:dare={statefulDare} let:expand>
        {#if $admin}
          <input
            type="checkbox"
            on:click={(e) => {
              if (e.currentTarget.checked) {
                selectedParentIds = [
                  ...selectedParentIds,
                  statefulDare.dare.dareId,
                ];
                statefulDare.selected = true;
                if (
                  statefulDares.every(
                    (dareToCheck) =>
                      dareToCheck.selected &&
                      dareToCheck.dare.children.length ===
                        dareToCheck.selectedVariants.length
                  )
                ) {
                  allSelected = true;
                }
              } else {
                allSelected = false;
                statefulDare.selected = false;
                selectedParentIds = selectedParentIds.filter(
                  (id) => id !== statefulDare.dare.dareId
                );
              }
            }}
          />
        {/if}
        expand: {expand.toString()}
        <Dare
          on:selectVariant={(e) => {
            statefulDare.selectedVariants = [
              ...statefulDare.selectedVariants,
              e.detail.variantId,
            ];
            allSelectedVariantIds = [
              ...allSelectedVariantIds,
              e.detail.variantId,
            ];
            if (
              statefulDares.every(
                (dareToCheck) =>
                  dareToCheck.selected &&
                  dareToCheck.dare.children.length ===
                    dareToCheck.selectedVariants.length
              )
            ) {
              allSelected = true;
            }
          }}
          on:deselectVariant={(e) => {
            allSelected = false;
            statefulDare.selectedVariants =
              statefulDare.selectedVariants.filter(
                (id) => id !== e.detail.variantId
              );
            allSelectedVariantIds = allSelectedVariantIds.filter(
              (id) => id !== e.detail.variantId
            );
          }}
          on:discard={() => {
            statefulDare.editable = false;
            editInProcess = false;
          }}
          on:variantDiscard={() => {
            statefulDare.editingVariantId = "";
            editInProcess = false;
          }}
          on:save={async (e) => {
            statefulDare.saving = true;
            variantErrors = [];
            const parsedDare = DareDbInputSchema.safeParse(e.detail.newDare);
            if (!parsedDare.success) {
              variantErrors = [...variantErrors, "Error saving dare."];
              statefulDare.saving = false;
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
              statefulDare.saving = false;
              return;
            }
            statefulDare.saving = false;
            editInProcess = false;
            invalidate("api/dares");
          }}
          on:variantSave={async (e) => {
            statefulDare.savingVariant = true;
            variantErrors = [];
            const parsedDare = DareDbInputSchema.safeParse(e.detail.newDare);
            if (!parsedDare.success) {
              variantErrors = [...variantErrors, "Error saving dare."];
              statefulDare.savingVariant = false;
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
              statefulDare.savingVariant = false;
              return;
            }
            statefulDare.savingVariant = false;
            statefulDare.editingVariantId = "";
            editInProcess = false;
            invalidate("api/dares");
          }}
          dare={statefulDare.dare}
          admin={$admin}
          loggedIn={$loggedIn}
          editable={statefulDare.editable}
          saving={statefulDare.saving}
          editingVariantId={statefulDare.editingVariantId}
          savingVariant={statefulDare.savingVariant}
          selectableVariants
          selectedVariants={statefulDare.selectedVariants}
          expand={expand ||
            !!statefulDare.editingVariantId ||
            !!statefulDare.selectedVariants.length}
          withDetails
          withVariants
        >
          <svelte:fragment slot="buttons">
            <Button
              title="Add Variant"
              on:click={() => {
                maybeDiscardEditInProcess();
                editInProcess = true;
                newVariantParentId = statefulDare.dare.dareId;
                statefulDare.withNewVariant = true;
              }}>+</Button
            >
            {#if $admin}
              <Button
                title="Edit"
                on:click={() => {
                  maybeDiscardEditInProcess();
                  editInProcess = true;
                  statefulDare.editable = true;
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
                statefulDare.withNewVariant = true;
              }}>+</Button
            >
            {#if $admin}
              <Button
                title="Edit"
                on:click={() => {
                  maybeDiscardEditInProcess();
                  editInProcess = true;
                  statefulDare.editingVariantId = variantId;
                }}>Edit</Button
              >
            {/if}
          </svelte:fragment>
        </Dare>
        {#if statefulDare.withNewVariant}
          <NewDare
            on:discard={() => {
              variantErrors = [];
              statefulDare.withNewVariant = false;
              editInProcess = false;
            }}
            on:save={async (e) => {
              statefulDare.savingVariant = true;
              variantErrors = [];
              const parsedDare = DareDbInputSchema.safeParse(e.detail.newDare);
              if (!parsedDare.success) {
                variantErrors = [...variantErrors, "Error saving dare."];
                statefulDare.savingVariant = false;
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
                statefulDare.savingVariant = false;
                return;
              }
              if (!$loggedIn) {
                const dareAdded = await response.json();
                savedVariants = [...savedVariants, dareAdded];
              }
              statefulDare.savingVariant = false;
              statefulDare.withNewVariant = false;
              editInProcess = false;
              newVariantParentId = "";
              invalidate("api/dares");
            }}
            parentDare={newVariantParentId === statefulDare.dare.dareId
              ? statefulDare.dare
              : statefulDare.dare.children.find(
                  ({ dareId }) => dareId === newVariantParentId
                )}
            admin={$admin}
            loggedIn={$loggedIn}
            saving={statefulDare.savingVariant}
          />
        {/if}
      </svelte:fragment>
    </DareList>
  </section>
</main>
