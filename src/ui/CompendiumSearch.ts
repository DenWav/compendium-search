import type { DeepPartial, InexactPartial } from "@foundry/types/utils.mjs";
import { CompendiumIndex } from "../CompendiumIndex.js";
import {
  CompendiumDoc,
  FieldDescriptor,
  SearchDefinition,
  TabDefinition,
} from "../SearchDefinition.js";
import type { HandlebarsApplicationMixin as HandlebarsApplication } from "@foundry/client-esm/applications/api/_module.mjs";
import type { DocumentSearchOptions, EnrichedDocumentSearchResultSetUnit } from "flexsearch";
import { createElement, getOrDefault, reduceResults, sortField } from "../util.js";

import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;

type CompendiumSearchContext = {
  tabs?: Record<string, Partial<ApplicationTab>>,
  tab?: Partial<ApplicationTab>,
  search?: TabDefinition,
};

export class CompendiumSearch extends HandlebarsApplicationMixin(ApplicationV2<CompendiumSearchContext>) {

  // noinspection JSUnusedGlobalSymbols
  static override DEFAULT_OPTIONS: DeepPartial<ApplicationV2.Configuration> = {
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
    SearchDefinition.get.tabs.forEach(tab => {
      parts[`search-${tab.id}`] = {
        template: "modules/compendium-search/template/compendium-search.hbs",
      };
    });
    return parts;
  }

  override tabGroups: Record<string, string>;

  constructor(options: DeepPartial<ApplicationV2.Configuration> = {}) {
    super(options);

    this.tabGroups = {
      search: `search-${SearchDefinition.get.tabs[0].id}`,
    };
  }

  // noinspection JSUnusedGlobalSymbols
  protected override async _preparePartContext(
    partId: string,
    context: CompendiumSearchContext,
    _options: DeepPartial<HandlebarsApplicationMixin.HandlebarsRenderOptions>
  ): Promise<Record<string, unknown>> {
    if (partId === "tabs") {
      context.tabs = this.#getTabs();
    } else if (partId.startsWith("search")) {
      context.tab = (context.tabs as Record<string, Partial<ApplicationTab>>)[partId];
      const tabId = partId.slice(7);
      context.search = SearchDefinition.get.tabs.find(tab => tab.id === tabId);
    }

    return context;
  }

  #getTabs() {
    const tabs: Record<string, Partial<ApplicationTab>> = {};
    SearchDefinition.get.tabs.forEach(tab => {
      tabs[`search-${tab.id}`] = {
        id: `search-${tab.id}`,
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
    context: DeepPartial<CompendiumSearchContext>,
    options: DeepPartial<HandlebarsApplication.HandlebarsRenderOptions>
  ) {
    await super._preRender(context, options);
    await loadTemplates(SearchDefinition.get.tabs.map(t => t.resultTemplate));
  }

  // noinspection JSUnusedGlobalSymbols
  protected override _onRender(
    context: DeepPartial<CompendiumSearchContext>,
    options: DeepPartial<ApplicationV2.RenderOptions>
  ) {
    super._onRender(context, options);
    CompendiumSearch.#configureRanges();
    CompendiumSearch.#configureInputs();
  }

  // noinspection JSUnusedGlobalSymbols
  protected override _onFirstRender(
    context: DeepPartial<CompendiumSearchContext>,
    options: DeepPartial<ApplicationV2.RenderOptions>
  ) {
    super._onFirstRender(context, options);

    const firstSearchTab = document.getElementById(`search-${SearchDefinition.get.tabs[0].id}`);
    if (!firstSearchTab) {
      return;
    }

    void CompendiumSearch.#performSearch(firstSearchTab);
  }

  // noinspection JSUnusedGlobalSymbols
  override changeTab(
    tab: string,
    group: string,
    options?: InexactPartial<{
      event: Event;
      navElement: HTMLElement;
      force: boolean;
      updatePosition: boolean;
    }>
  ) {
    super.changeTab(tab, group, options);

    const tabElement = document.getElementById(tab);
    if (tabElement === null) {
      return;
    }
    const results = tabElement.querySelector<HTMLLIElement>(".compendium-search-result-list > li");
    if (results === null) {
      void CompendiumSearch.#performSearch(tabElement);
    }
  }

  static #configureInputs() {
    document.querySelectorAll(".compendium-search-filter").forEach(filterElement => {
      filterElement
        .querySelectorAll<HTMLInputElement>("input:not([type=button])")
        .forEach(input => {
          input.oninput = event => {
            event.preventDefault();
            void CompendiumSearch.#performSearch(event.target as HTMLElement);
          };
        });
    });
    document
      .querySelectorAll<HTMLSelectElement>(".compendium-search-sort-container > select")
      .forEach(selectElement => {
        selectElement.oninput = event => {
          event.preventDefault();
          void CompendiumSearch.#performSearch(event.target as HTMLElement);
        };
      });

    function selectButton(event: Event, container: HTMLElement, checked: boolean) {
      event.preventDefault();
      container.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach(input => {
        input.checked = checked;
      });
      void CompendiumSearch.#performSearch(event.target as HTMLElement);
    }
    document.querySelectorAll<HTMLElement>(".compendium-search-selection").forEach(container => {
      container.querySelectorAll<HTMLButtonElement>("button[data-cs-select]").forEach(button => {
        button.onclick = event => selectButton(event,  container,true);
      });
      container.querySelectorAll<HTMLButtonElement>("button[data-cs-deselect]").forEach(button => {
        button.onclick = event => selectButton(event,  container,false);
      });
    });
  }

  static async #performSearch(input: HTMLElement) {
    const parentTab = input.closest<HTMLElement>(".cs-tab");
    if (!parentTab) {
      return;
    }
    const resultList = parentTab.querySelector<HTMLUListElement>(".compendium-search-result-list");
    if (!resultList) {
      return;
    }

    const id = parentTab.id;
    if (!id || !id.startsWith("search-")) {
      return;
    }
    const tabId = id.substring(7);
    const searchTabConfig = SearchDefinition.get.tabs.find(tab => tab.id === tabId);
    if (!searchTabConfig) {
      return;
    }

    const index = CompendiumIndex.get.indexFor(searchTabConfig);
    if (!index) {
      return;
    }

    const searchObject = CompendiumSearch.#createSearchObject(searchTabConfig, parentTab);
    if (searchObject.length === 0) {
      resultList.replaceChildren();
      return;
    }
    const results = (
      await Promise.all(
        searchObject.map(s => index.searchAsync({ limit: 1000, enrich: true, ...s }))
      )
    ).flat();

    const resultMap = new Map<
      string,
      EnrichedDocumentSearchResultSetUnit<Record<string, string>>[]
    >();
    for (const res of results) {
      getOrDefault(resultMap, res.field, Array).push(res);
    }

    for (const s of searchObject) {
      // @ts-expect-error
      if (!resultMap.has(s.field)) {
        // This field isn't present in the result, so it matches nothing
        resultList.replaceChildren();
        return;
      }
    }

    const reduced = reduceResults(
      resultMap,
      r => r.result.map(v => v.doc),
      v => v.id
    );

    const sorted = Array.from(reduced)
      .sort(CompendiumSearch.#getSortFunction(parentTab, searchTabConfig.schema) ?? undefined)
      .slice(0, 100)
      .map(d => d.id as string);

    resultList.replaceChildren();
    for (const res of sorted) {
      const doc = (await fromUuid(res)) as CompendiumDoc | null;
      if (doc !== null) {
        const renderedDoc = createElement(
          await renderTemplate(searchTabConfig.resultTemplate, doc)
        );
        const anchor = renderedDoc.querySelector("a");
        if (anchor) {
          anchor.onclick = async () => {
            if (doc?.sheet) {
              doc.sheet.render(true);
            }
          };
        }
        resultList.append(renderedDoc);
      }
    }
  }

  static #createSearchObject(
    tab: TabDefinition,
    filterElement: HTMLElement
  ): Partial<DocumentSearchOptions<false>>[] {
    const res: Partial<DocumentSearchOptions<false>>[] = [];

    const inputFields = Array.from(
      filterElement.querySelectorAll<HTMLInputElement>("input[data-cs-field]")
    );

    for (const key of Object.keys(tab.schema)) {
      const inputs = inputFields.filter(i => i.dataset.csField === key);

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
            Object.keys(field.options).length + 2 !== inputs.length
          ) {
            const msg =
              `Incorrect number of inputs for selectable field: ${field.title}: ` +
              `${inputs.length} (expected ${Object.keys(field.options).length})`;
            throw Error(msg);
          }

          if (field.type === "string" || field.type === "number") {
            const selectedOptions = inputs
              .filter(i => i.checked)
              .map(i => i.dataset.csSelect)
              .filter(v => v !== undefined);

            // nothing is selected, so it's impossible for any items to match
            if (selectedOptions.length === 0) {
              return [];
            }

            res.push(
              ...selectedOptions.map(opt => {
                const o: Partial<DocumentSearchOptions<false>> = {
                  query: opt,
                  // @ts-expect-error
                  field: key,
                };
                return o;
              })
            );
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
          for (let i = minValue; i <= maxValue; i += field.step) {
            options.push(i);
          }

          res.push(
            ...options.map(opt => {
              const o: Partial<DocumentSearchOptions<false>> = {
                query: opt.toString(),
                // @ts-expect-error
                field: key,
              };
              return o;
            })
          );

          break;
        }
        default:
          // @ts-expect-error
          throw Error(`Invalid field kind: ${field.kind}`);
      }
    }

    return res;
  }

  static #getSortFunction(
    tab: HTMLElement,
    schema: Record<string, FieldDescriptor>
  ): ((left: Record<string, string>, right: Record<string, string>) => number) | null {
    const sortBy = tab.querySelector<HTMLSelectElement>(".compendium-search-sort-by");
    const sortDir = tab.querySelector<HTMLSelectElement>(".compendium-search-sort-dir");

    if (!sortBy || !sortDir || sortBy.selectedIndex === -1 || sortDir.selectedIndex === -1) {
      return null;
    }

    const sortDirValue = sortDir.options[sortDir.selectedIndex].value;
    if (sortDirValue !== "asc" && sortDirValue !== "desc") {
      return null;
    }

    const sortByField = sortBy.options[sortBy.selectedIndex].value;
    if (!(sortByField in schema)) {
      return null;
    }

    const fieldDesc = schema[sortByField];
    if (
      fieldDesc.type === "string" ||
      fieldDesc.type === "number" ||
      fieldDesc.type === "boolean"
    ) {
      return sortField(sortByField, sortDirValue, fieldDesc.type);
    } else {
      return null;
    }
  }

  static #configureRanges() {
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

  static #configureBubble(
    shadow: HTMLDivElement,
    range: HTMLInputElement,
    otherRange: HTMLInputElement
  ) {
    const bubble: HTMLOutputElement = range.nextElementSibling! as HTMLOutputElement;
    const otherBubble: HTMLOutputElement = otherRange.nextElementSibling! as HTMLOutputElement;
    range.addEventListener("input", () => {
      this.#setBubble(range, bubble, otherBubble);
      this.#setShadow(shadow, range, otherRange);
    });
    this.#setBubble(range, bubble, otherBubble);
  }

  static #setBubble(
    range: HTMLInputElement,
    bubble: HTMLOutputElement,
    otherBubble: HTMLOutputElement
  ) {
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

  static #setBubbleValue(bubble: HTMLOutputElement, value: unknown) {
    bubble.innerHTML = `<span>${value}</span>`;
  }

  static #sortBubbles(
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

  static #setShadow(shadow: HTMLDivElement, first: HTMLInputElement, second: HTMLInputElement) {
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

  static async rebuildIndex(_event: PointerEvent, element: HTMLElement) {
    await CompendiumIndex.get.rebuild();
    await CompendiumSearch.#performSearch(element);
  }
}
