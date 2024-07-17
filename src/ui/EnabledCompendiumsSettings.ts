import type { DeepPartial } from "@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs";
import type {
  ApplicationConfiguration,
  ApplicationRenderContext,
  ApplicationRenderOptions,
} from "@foundry/client-esm/applications/_types.mjs";
import { createElement } from "../util";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EnabledCompendiumsSettings extends HandlebarsApplicationMixin(ApplicationV2) {
  data: string[];
  tree: CompendiumTree | null;

  // noinspection JSUnusedGlobalSymbols
  static override DEFAULT_OPTIONS = {
    id: "compendium-search-enabled-compendiums-app",
    tag: "form",
    form: {
      handler: EnabledCompendiumsSettings.formHandler,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    window: {
      title: "Compendium Search - Enabled Compendiums",
      resizable: true,
    },
    position: {
      width: 500,
      height: 800,
    },
  };

  // noinspection JSUnusedGlobalSymbols
  static override PARTS = {
    settings: {
      template: "modules/compendium-search/template/enabled-compendiums.hbs",
    },
  };

  constructor(options: DeepPartial<ApplicationConfiguration>) {
    super(options);
    if (game.settings && game.packs) {
      this.data = game.settings.get("compendium-search", "enabled-compendiums") as string[];
      this.tree = (game.packs as CompendiumPacks).tree;
    } else {
      this.data = [];
      this.tree = null;
    }
  }

  // noinspection JSUnusedGlobalSymbols
  protected override _onRender(
    context: DeepPartial<ApplicationRenderContext>,
    options: DeepPartial<ApplicationRenderOptions>
  ) {
    super._onRender(context, options);

    const app = document.getElementById("compendium-search-enabled-compendiums-app-content");
    if (!app) {
      return;
    }
    const list = document.createElement("ul");

    if (this.tree) {
      this.buildList([], list, this.tree);
    }
    app.append(list);
  }

  static async formHandler(
    _event: SubmitEvent,
    form: HTMLFormElement,
    _formData: FormDataExtended
  ) {
    if (!game.settings) {
      return;
    }

    const result: string[] = [];

    const elements = form.getElementsByTagName("input");
    for (const element of elements) {
      if (element.checked && element.dataset.compendiumId) {
        result.push(element.dataset.compendiumId);
      }
    }

    await game.settings.set("compendium-search", "enabled-compendiums", result);
  }

  private buildList(depth: number[], list: HTMLUListElement, current: CompendiumTree) {
    let count = 0;
    for (const childTree of current.children) {
      const childList = document.createElement("ul");
      this.buildList([...depth, count], childList, childTree);

      let listItem: HTMLElement;
      if (childTree.folder) {
        // @ts-expect-error
        const cssColor = childTree.folder.color.toRGBA(0.85);
        listItem = createElement(`<li style="background-color: ${cssColor};"></li>`);

        const folderId = this.computeId([...depth, count]);
        const folderItem = createElement(`<input type="checkbox" id="${folderId}" />`);
        folderItem.onchange = () => {
          const isChecked = folderItem.checked;
          childList.querySelectorAll("input").forEach(elem => {
            elem.checked = isChecked;
          });

          if (!isChecked) {
            this.uncheckParents(depth);
          }
        };

        const childInputs = Array.from(childList.getElementsByTagName("input"));
        const isAllChecked = childInputs.every(elem => elem.checked);
        if (childInputs.length > 0 && isAllChecked) {
          folderItem.checked = true;
        }

        listItem.append(folderItem);
        listItem.append(createElement(`<label for="${folderId}">${childTree.folder.name}</label>`));
      } else {
        listItem = document.createElement("li");
      }

      listItem.append(childList);
      list.append(listItem);

      count++;
    }

    for (const entry of current.entries) {
      const label = entry.metadata.label;
      const entryId = this.computeId([...depth, count]);

      const listElement = document.createElement("li");
      const entryItem = createElement(
        `<input type="checkbox" id="${entryId}" data-compendium-id="${entry.metadata.id}" />`
      );
      entryItem.onchange = () => {
        this.uncheckParents(depth);
      };

      listElement.append(entryItem);
      listElement.append(createElement(`<label for="${entryId}">${label}</label>`));
      list.append(listElement);

      if (this.data.includes(entry.metadata.id)) {
        entryItem.checked = true;
      }

      count++;
    }
  }

  private uncheckParents(depth: number[]) {
    for (let i = 0; i < depth.length; i++) {
      const parentId = this.computeId(depth.slice(0, i === 0 ? undefined : -i));
      (document.getElementById(parentId) as HTMLInputElement).checked = false;
    }
  }

  private computeId(depth: number[]): string {
    let id = "cs-comp-select";
    for (const d of depth) {
      id += `-${d}`;
    }
    return id;
  }
}
