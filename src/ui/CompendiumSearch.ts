import type {
  ApplicationConfiguration,
  ApplicationRenderContext,
  ApplicationRenderOptions,
} from "@foundry/client-esm/applications/_types.mjs";
import type { DeepPartial } from "@foundry/types/utils.mjs";
import { CompendiumIndex } from "../CompendiumIndex.js";
import {CompendiumDoc, SearchDefinition, TabDefinition} from "../SearchDefinition.js";
import type { HandlebarsApplicationMixin as HandlebarsApplication } from "@foundry/client-esm/applications/api/_module.mjs";
import type { DocumentSearchOptions, SimpleDocumentSearchResultSetUnit } from "flexsearch";
import {createElement} from "../util";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class CompendiumSearch extends HandlebarsApplicationMixin(ApplicationV2) {
  // noinspection JSUnusedGlobalSymbols
  static override DEFAULT_OPTIONS = {
    id: "compendium-search-app",
    window: {
      title: "CS.title",
      resizable: true,
    },
    position: {
      width: 1200,
      height: 800,
    },
    actions: {
      rebuildIndex: CompendiumSearch.rebuildIndex,
    },
  };

  // noinspection JSUnusedGlobalSymbols
  static override get PARTS(): Record<string, HandlebarsApplication.HandlebarsTemplatePart> {
    const parts: Record<string, HandlebarsApplication.HandlebarsTemplatePart> = {
      tabs: {
        classes: ["compendium-search-tabs"],
        template: "templates/generic/tab-navigation.hbs",
      },
    };
    SearchDefinition.get.tabs.forEach((_tab, index) => {
      parts[`search-${index}`] = {
        template: "modules/compendium-search/template/compendium-search.hbs",
      };
    });
    return parts;
  }

  // noinspection JSUnusedGlobalSymbols
  override tabGroups: Record<string, string> = {
    search: "search-0", // first tab
  };

  constructor(options: DeepPartial<ApplicationConfiguration> = {}) {
    super(options);
  }

  // noinspection JSUnusedGlobalSymbols
  protected override async _preparePartContext(
    partId: string,
    context: ApplicationRenderContext,
    _options: DeepPartial<HandlebarsApplication.HandlebarsRenderOptions>
  ): Promise<ApplicationRenderContext> {
    if (partId === "tabs") {
      context.tabs = this.#getTabs();
    } else if (partId.startsWith("search")) {
      context.tab = context.tabs[partId];
      context.search = SearchDefinition.get.tabs[parseInt(partId.slice(7), 10)];
    }

    return context;
  }

  #getTabs() {
    const tabs: Record<string, Partial<ApplicationTab>> = {};
    SearchDefinition.get.tabs.forEach((tab, index) => {
      tabs[`search-${index}`] = {
        id: `search-${index}`,
        group: "search",
        icon: tab.icon,
        label: tab.title,
      };
    });
    for (const v of Object.values(tabs)) {
      v.active = this.tabGroups[v.group!] === v.id;
      v.cssClass = v.active ? "active" : "";
    }
    return tabs;
  }

  // noinspection JSUnusedGlobalSymbols
  protected override async _preRender(
    context: DeepPartial<ApplicationRenderContext>,
    options: DeepPartial<HandlebarsApplication.HandlebarsRenderOptions>,
  ) {
    await super._preRender(context, options);
    await loadTemplates(SearchDefinition.get.tabs.map(t => t.resultTemplate));
  }

  // noinspection JSUnusedGlobalSymbols
  protected override _onRender(
    context: DeepPartial<ApplicationRenderContext>,
    options: DeepPartial<ApplicationRenderOptions>
  ) {
    super._onRender(context, options);
    this.#configureRanges();
    this.#configureInputs();
  }

  #configureInputs() {
    document.querySelectorAll(".compendium-search-filter").forEach(filterElement => {
      filterElement
        .querySelectorAll<HTMLInputElement>("input:not([type=button])")
        .forEach(input => {
          input.oninput = async event => {
            event.preventDefault();
            await this.performSearch(event.currentTarget as HTMLElement);
          };
        });
    });
  }

  async performSearch(input: HTMLElement) {
    const packs = game.packs;
    if (!packs) {
      return;
    }

    const parentTab = input.closest<HTMLElement>(".cs-tab");
    if (!parentTab) {
      return;
    }
    const resultList = parentTab.querySelector<HTMLUListElement>("#compendium-search-result-list")
    if (!resultList) {
      return;
    }

    const id = parentTab.id;
    if (!id || !id.startsWith("search-")) {
      return;
    }
    const tabNum = parseInt(id.slice(7), 10);
    if (tabNum >= SearchDefinition.get.tabs.length) {
      return;
    }
    const searchTabConfig = SearchDefinition.get.tabs[tabNum];

    const index = CompendiumIndex.get.indexFor(searchTabConfig);
    if (!index) {
      return;
    }

    const searchObject = this.#createSearchObject(searchTabConfig, parentTab);
    const allResults = await Promise.all(searchObject.map(s => index.searchAsync({ limit: 250, ...s })));
    const results = allResults.flat();

    const resultMap = new Map<string, SimpleDocumentSearchResultSetUnit[]>()
    results.forEach(res => {
      if (resultMap.has(res.field)) {
        resultMap.get(res.field)?.push(res);
      } else {
        resultMap.set(res.field, [res]);
      }
    });

    const resultGroupSets: Set<string>[] = [];
    for (const resultGroup of resultMap.values()) {
      // For multiple queries using the same field, we "or" them
      resultGroupSets.push(new Set(resultGroup.flatMap(r => r.result as string[])));
    }
    const reduced = resultGroupSets.reduce((acc, current) => {
      if (acc.size === 0) {
        return current;
      } else {
        return acc.intersection(current);
      }
    }, new Set<string>());

    const packMap: Map<string, CompendiumCollection<CompendiumCollection.Metadata>> = new Map();
    packs.forEach(pack => packMap.set(pack.collection, pack));

    const documents: CompendiumDoc[] = [];
    for (const res of reduced) {
      const idIndex = res.lastIndexOf(".")
      const ending = res.lastIndexOf(".", idIndex - 1);
      const name = res.substring(11, ending);
      const pack = packMap.get(name);
      if (pack) {
        const doc = await pack.getDocument(res.substring(idIndex + 1));
        if (doc) {
          documents.push(doc);
        }
      }
    }

    const sortedResults = Array.from(documents)
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()))
      .slice(0, 50);

    resultList.replaceChildren();
    for (const doc of sortedResults) {
      const docHtml = await renderTemplate(searchTabConfig.resultTemplate, doc);
      resultList.append(createElement(docHtml));
    }
  }

  #createSearchObject(
    tab: TabDefinition,
    filterElement: HTMLElement
  ): Partial<DocumentSearchOptions<false>>[] {
    const res: Partial<DocumentSearchOptions<false>>[] = [];

    const inputFields = Array.from(filterElement.querySelectorAll<HTMLInputElement>("input[data-cs-field]"))

    for (const key of Object.keys(tab.schema)) {
      const inputs = inputFields.filter(i => i.dataset.csField === key)

      const field = tab.schema[key];
      switch (field.kind) {
        case "searchable": {
          if (inputs.length !== 1) {
            const msg = `Incorrect number of inputs for searchable field: ${field.title}: ${inputs.length}`;
            throw Error(msg);
          }

          if (inputs[0].value.length > 0) {
            res.push({
              query: inputs[0].value,
              // @ts-expect-error
              field: key,
            });
          }

          break;
        }
        case "selectable": {
          if (field.type === "boolean" && inputs.length !== 1) {
            const msg = `Incorrect number of inputs for boolean field: ${field.title}: ${inputs.length}`;
            throw Error(msg);
          } else if (
            (field.type === "string" || field.type === "number") &&
            Object.keys(field.options).length !== inputs.length
          ) {
            const msg =
              `Incorrect number of inputs for selectable field: ${field.title}: ` +
              `${inputs.length} (expected ${Object.keys(field.options).length})`;
            throw Error(msg);
          }

          if (field.type === "string" || field.type === "number") {
            const selectedOptions = inputs.filter(i => i.checked)
              .map(i => i.dataset.csSelect)
              .filter(v => v !== undefined);

            // Don't include this in the search if all options are selected (not necessary)
            if (selectedOptions.length < Object.keys(field.options).length) {
              res.push(...selectedOptions.map(opt => {
                const o: Partial<DocumentSearchOptions<false>> = {
                  query: opt,
                  // @ts-expect-error
                  field: key,
                };
                return o;
              }));
            }
          } else {
            res.push({
              query: inputs[0].checked.toString(),
              // @ts-expect-error
              field: key,
            });
          }

          break;
        }
        case "range": {
          // sanity check
          if (field.type !== "number") {
            // @ts-expect-error
            throw Error(`Invalid type for range field: ${field.title}: ${field.type}`);
          } else if (inputs.length !== 2) {
            const msg = `Incorrect number of inputs for range field: ${field.title}: ${inputs.length}`;
            throw Error(msg);
          }

          const [firstValue, secondValue] = inputs.map(i => parseInt(i.value, 10));
          const minValue = Math.max(field.min, Math.min(firstValue, secondValue));
          const maxValue = Math.min(field.max, Math.max(firstValue, secondValue));

          const options: number[] = [];
          // eslint-disable-next-line no-empty
          for (let i = minValue; i <= maxValue; i += field.step) {
            options.push(i);
          }

          res.push(...options.map(opt => {
            const o: Partial<DocumentSearchOptions<false>> = {
              query: opt.toString(),
              // @ts-expect-error
              field: key,
            };
            return o;
          }));

          break;
        }
        default:
          // @ts-expect-error
          throw Error(`Invalid field kind: ${field.kind}`);
      }
    }

    return res;
  }

  #configureRanges() {
    document.querySelectorAll(".cs-range-container").forEach(wrap => {
      const shadow = wrap.querySelector<HTMLDivElement>(".cs-range-shadow");
      if (shadow === null) {
        return;
      }

      const inputs: NodeListOf<HTMLInputElement> = wrap.querySelectorAll("input[type=range]");
      if (inputs.length !== 2) {
        return;
      }
      const first = inputs.item(0);
      const second = inputs.item(1);
      this.#setShadow(shadow, first, second);

      this.#configureBubble(shadow, first, second);
      this.#configureBubble(shadow, second, first);
    });
  }

  #configureBubble(shadow: HTMLDivElement, range: HTMLInputElement, otherRange: HTMLInputElement) {
    const bubble: HTMLOutputElement = range.nextElementSibling! as HTMLOutputElement;
    const otherBubble: HTMLOutputElement = otherRange.nextElementSibling! as HTMLOutputElement;
    range.addEventListener("input", () => {
      this.#setBubble(range, bubble, otherBubble);
      this.#setShadow(shadow, range, otherRange);
    });
    this.#setBubble(range, bubble, otherBubble);
  }

  #setBubble(range: HTMLInputElement, bubble: HTMLOutputElement, otherBubble: HTMLOutputElement) {
    const val = parseInt(range.value, 10);
    const otherVal = parseInt((otherBubble.previousElementSibling as HTMLInputElement).value, 10);

    const min = parseInt(range.min, 10);
    const max = parseInt(range.max, 10);
    this.#setBubbleValue(bubble, val);

    const newPosition = Math.floor(Number(((val - min) * 100) / (max - min)));
    const otherPosition = Math.floor(Number(((otherVal - min) * 100) / (max - min)));

    // Magic numbers based on size of the UI thumb
    bubble.style.left = `calc(${newPosition}% + (${8 - newPosition * 0.15}px))`;
    otherBubble.style.left = `calc(${otherPosition}% + (${8 - otherPosition * 0.15}px))`;

    // reset both on each move
    bubble.style.display = "flex";
    otherBubble.style.display = "flex";

    // Reset other value in case it was changed previously
    this.#setBubbleValue(otherBubble, otherVal);

    // handle overlapping
    if (val !== otherVal) {
      const ourRect = bubble.getBoundingClientRect();
      const otherRect = otherBubble.getBoundingClientRect();
      if (ourRect.right > otherRect.left && ourRect.left < otherRect.right) {
        // overlapping
        const {
          bubbles: [leftBubble, rightBubble],
          values: [leftVal, rightVal],
        } = this.#sortBubbles(val, otherVal, bubble, otherBubble);
        leftBubble.style.display = "none";
        rightBubble.innerHTML = `<span>${leftVal}</span>-<span>${rightVal}</span>`;
        rightBubble.style.left = `calc(${rightBubble.style.left} - 10px)`;
      }
    }
  }

  #setBubbleValue(bubble: HTMLOutputElement, value: unknown) {
    bubble.innerHTML = `<span>${value}</span>`;
  }

  #sortBubbles(
    value1: number,
    value2: number,
    bubble1: HTMLOutputElement,
    bubble2: HTMLOutputElement
  ): {
    bubbles: HTMLOutputElement[];
    values: number[];
  } {
    if (value1 < value2) {
      return {
        bubbles: [bubble1, bubble2],
        values: [value1, value2],
      };
    } else {
      return {
        bubbles: [bubble2, bubble1],
        values: [value2, value1],
      };
    }
  }

  #setShadow(shadow: HTMLDivElement, first: HTMLInputElement, second: HTMLInputElement) {
    const firstNum = parseInt(first.value, 10);
    const secondNum = parseInt(second.value, 10);
    const leftSide = Math.min(firstNum, secondNum);
    const rightSide = Math.max(firstNum, secondNum);

    if (leftSide === rightSide) {
      shadow.style.width = "0%";
      shadow.style.left = "0%";
      return;
    }

    const min = parseInt(first.min, 10);
    const max = parseInt(first.max, 10);

    const position = (leftSide - min) / (max - min);
    shadow.style.left = `${position * 100}%`;

    const width = (rightSide - leftSide) / (max - min);
    shadow.style.width = `${width * 100}%`;
  }

  static async rebuildIndex(_event: Event, _element: HTMLButtonElement) {
    await CompendiumIndex.get.rebuild();
  }
}

