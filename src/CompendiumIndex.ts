import type { IndexOptions } from "flexsearch";
import flexsearch from "flexsearch";
import {
  CompendiumDoc,
  FieldDescriptor,
  ForSchema,
  RangeNumberFieldDescriptor,
  SearchableStringFieldDescriptor,
  SearchDefinition,
  SelectableNumberFieldDescriptor,
  SelectableStringFieldDescriptor,
  TabDefinition,
} from "./SearchDefinition.js";
import { chunkify, createElement } from "./util.js";

type IndexField = IndexOptions<unknown> & { field: string };
type IndexDefinition = {
  tab: TabDefinition;
  index: flexsearch.Document<Record<string, string>, true>;
};

export class CompendiumIndex {
  static #instance: CompendiumIndex | null = null;

  static get get(): CompendiumIndex {
    if (CompendiumIndex.#instance) {
      return CompendiumIndex.#instance;
    }
    const index = new CompendiumIndex();
    CompendiumIndex.#instance = index;
    return index;
  }

  #indices: IndexDefinition[] | null = null;
  #needsRebuild: boolean = true;

  get needsRebuild(): boolean {
    return this.#needsRebuild;
  }

  markNeedsRebuild() {
    this.#needsRebuild = true;
  }

  indexFor(tab: TabDefinition): flexsearch.Document<Record<string, string>, true> | null {
    return this.#indices?.find(i => i.tab === tab)?.index ?? null;
  }

  async rebuild() {
    if (!game.settings || !game.packs) {
      return;
    }

    const packs = game.packs;
    const enabled = game.settings.get("compendium-search", "enabled-compendiums") as string[];

    const indices = this.#getIndices();

    const loader = CompendiumIndex.#initProgressDisplay();

    for (const pack of packs.contents) {
      let count = 0;
      let currentPct = 0;

      if (!enabled.includes(pack.metadata.id)) {
        continue;
      }
      if (!indices.some(i => pack.metadata.type === i.tab.type)) {
        continue;
      }

      const packName = CompendiumIndex.#getPackName(pack);

      console.log(`Compendium Search | Indexing ${packName}`);

      // @ts-expect-error
      const compendiumIndex = await pack.getIndex({ fields: ["_id"] });
      const total = compendiumIndex.contents.length;

      CompendiumIndex.#displayProgressBar(loader, `Indexing ${packName}: 0 / ${total}`, 0);

      for (const chunk of chunkify(compendiumIndex.contents, 5)) {
        const compendiumDocs = await pack.getDocuments({ _id__in: chunk.map(c => c._id) });

        for (const doc of compendiumDocs) {
          const newPct = Math.floor((count / total) * 100);
          if (newPct !== currentPct) {
            currentPct = newPct;
            CompendiumIndex.#displayProgressBar(
              loader,
              `Indexing ${packName}: ${count} / ${total}`,
              newPct
            );
          }

          count++;

          // exclude items which only appear inside containers
          const container = (doc as any)?.system?.container;
          if (container !== undefined && container !== null) {
            continue;
          }

          for (const index of indices) {
            if (pack.metadata.type !== index.tab.type) {
              continue;
            }
            const mapped = await index.tab.mapper(doc);
            if (mapped === null) {
              continue;
            }
            const stored = this.#toStoredDocument(doc, mapped, index.tab);
            await index.index.addAsync(stored.id, stored);
          }
        }
      }

      CompendiumIndex.#displayProgressBar(loader, `Indexing ${packName}: ${total} / ${total}`, 100);
    }

    if (loader) {
      $(loader).fadeOut(2000, () => {
        CompendiumIndex.#removeProgressDisplay();
      });
    } else {
      CompendiumIndex.#removeProgressDisplay();
    }

    const request = window.indexedDB.open("compendium-search", 1);
    request.onsuccess = (event) => {
      // @ts-expect-error
      const db: IDBDatabase = event.target.result;

      for (const index of indices) {
        void index.index.export((exportId, value) => {
          const key = `${index.tab.id}-${exportId}`;

          const transaction = db.transaction(["indices"], "readwrite");
          transaction.objectStore("indices").add(value, key);

          // @ts-expect-error
          void FilePicker.uploadPersistent("compendium-search", `${key}.json`, new File([value as string], `${key}.json`, { type: 'application/json' }));
        });
      }
    };

    this.#needsRebuild = false;
  }

  static #getPackName(pack: CompendiumCollection<CompendiumCollection.Metadata>): string {
    if (!pack.folder) {
      return pack.metadata.label;
    }
    const ancestors = [...pack.folder.ancestors, pack.folder];
    // @ts-expect-error
    const folderName = ancestors.map(a => a.name).join("/");
    return `${folderName}/${pack.metadata.label}`;
  }

  static #initProgressDisplay(): HTMLDivElement | null {
    this.#removeProgressDisplay();

    const sceneLoadBar = document.getElementById("loading");
    if (sceneLoadBar === null) {
      return null;
    }

    const newLoadBar = createElement("<div id='compendium-search-loading'></div>");
    newLoadBar.append(createElement("<div class='compendium-search-loading-bar'></div>"));
    newLoadBar.append(createElement("<label class='compendium-search-loading-context'></label>"));
    newLoadBar.append(createElement("<label class='compendium-search-loading-progress'></label>"));

    sceneLoadBar.after(newLoadBar);

    return newLoadBar;
  }

  static #removeProgressDisplay() {
    document.getElementById("compendium-search-loading")?.remove();
  }

  static #displayProgressBar(loader: HTMLElement | null, label: string, pct: number) {
    if (!loader) {
      return;
    }

    const clampedPct = Math.clamp(pct, 0, 100);
    loader.querySelector(".compendium-search-loading-context")!.textContent = label;
    (loader.querySelector(".compendium-search-loading-bar")! as HTMLElement).style.width =
      `${clampedPct}%`;
    loader.querySelector(".compendium-search-loading-progress")!.textContent =
      `${Math.floor(clampedPct)}%`;
    loader.style.display = "grid";
  }

  #toStoredDocument(
    doc: CompendiumDoc,
    input: ForSchema,
    def: TabDefinition
  ): Record<string, string> & { id: string } {
    const result: Record<string, string> & { id: string } = {
      id: doc.uuid,
    };

    for (const key of Object.keys(input)) {
      if (key === "id") {
        continue;
      }

      const fieldDesc = def.schema[key];
      const value = input[key];

      // Verify values are valid
      if (typeof value === "string") {
        if ("options" in fieldDesc) {
          if (
            !(value in (fieldDesc as SelectableStringFieldDescriptor).options) &&
            value !== "custom"
          ) {
            result[key] = "other";
            result[`${key}$real`] = value;
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      } else if (typeof value === "number") {
        if ("options" in fieldDesc) {
          if (!(value.toString() in (fieldDesc as SelectableNumberFieldDescriptor).options)) {
            throw Error(`Invalid field value: ${value} for field ${key}`);
          }
          result[key] = value.toString();
        } else {
          const range = fieldDesc as RangeNumberFieldDescriptor;
          result[`${key}$real`] = value.toString();
          if (value <= range.min) {
            result[key] = range.min.toString();
          } else if (value >= range.max) {
            result[key] = range.max.toString();
          } else {
            if (value <= range.min) {
              result[key] = range.min.toString();
            } else if (value >= range.max) {
              result[key] = range.max.toString();
            } else {
              // round the given value into the stepped range
              const roundedValue =
                range.min + range.step * Math.round((value - range.min) / range.step);
              result[key] = roundedValue.toString();
            }
          }
        }
      } else if (typeof value === "boolean") {
        result[key] = value.toString();
      }
    }

    return result;
  }

  #getIndices(): IndexDefinition[] {
    if (this.#indices !== null) {
      return this.#indices;
    }

    const tabs = SearchDefinition.get.tabs;
    const indices = tabs.map(t => {
      const fields: IndexField[] = [];

      for (const key of Object.keys(t.schema)) {
        const descriptor: FieldDescriptor = t.schema[key];

        if (descriptor.type === "string") {
          this.#handleString(fields, key, descriptor);
        } else if (descriptor.type === "number") {
          this.#handleStrict(fields, key);
          if (!("options" in descriptor)) {
            if (
              !Number.isInteger(descriptor.min) ||
              !Number.isInteger(descriptor.max) ||
              !Number.isInteger(descriptor.step)
            ) {
              throw Error(`Invalid range for number field (all values must be integers): ${key}`);
            }
          }
        } else if (descriptor.type === "boolean") {
          this.#handleStrict(fields, key);
        } else {
          // @ts-expect-error
          throw Error(`Invalid field type: ${descriptor.type}`);
        }
      }

      return {
        tab: t,
        index: new flexsearch.Document<Record<string, string>, true>({
          preset: "performance",
          document: {
            id: "id",
            index: fields,
            store: true,
          },
        }),
      };
    });

    this.#indices = indices;
    this.#needsRebuild = true;
    return indices;
  }

  #handleString(
    fields: IndexField[],
    key: string,
    descriptor: SearchableStringFieldDescriptor | SelectableStringFieldDescriptor
  ) {
    switch (descriptor.kind) {
      case "searchable": {
        this.#handleSearchable(fields, key);
        break;
      }
      case "selectable": {
        this.#handleStrict(fields, key);
        break;
      }
      default: {
        // @ts-expect-error
        throw Error(`Invalid field kind: ${descriptor.kind}`);
      }
    }
  }

  #handleSearchable(fields: IndexField[], key: string) {
    fields.push({
      field: key,
      preset: "performance",
      tokenize: "full",
      charset: "latin:simple",
      context: {
        resolution: 3,
        depth: 5,
      },
    });
  }

  #handleStrict(fields: IndexField[], key: string) {
    fields.push({
      field: key,
      preset: "match",
      tokenize: "strict",
      charset: "latin:false",
    });
  }
}
