import type {
  ApplicationConfiguration,
  ApplicationRenderContext,
  ApplicationRenderOptions,
} from "@foundry/client-esm/applications/_types.mjs";
import type { DeepPartial } from "@foundry/types/utils.mjs";
import { CompendiumIndex } from "../CompendiumIndex.js";
import { SearchDefinition, TabDefinition } from "../SearchDefinition.js";
import type { HandlebarsApplicationMixin as HandlebarsApplication } from "@foundry/client-esm/applications/api/_module.mjs";
import type { DocumentSearchOptions } from "flexsearch";

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
      context.search = SearchDefinition.get.tabs[parseInt(partId.slice(7))];
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
  protected override _onRender(
    _context: DeepPartial<ApplicationRenderContext>,
    _options: DeepPartial<ApplicationRenderOptions>
  ) {
    this.#configureRanges();
    this.#configureInputs();
  }

  #configureInputs() {
    document.querySelectorAll(".compendium-search-filter").forEach(filterElement => {
      filterElement
        .querySelectorAll<HTMLInputElement>("input:not([type=button])")
        .forEach(input => {
          input.oninput = event => {
            event.preventDefault();
            this.performSearch(event.currentTarget as HTMLElement);
          };
        });
    });
  }

  performSearch(input: HTMLElement) {
    const parentTab = input.closest<HTMLElement>(".cs-tab");
    if (!parentTab) {
      return;
    }
    const id = parentTab.id;
    if (!id || !id.startsWith("search-")) {
      return;
    }
    const tabNum = parseInt(id.slice(7));
    if (tabNum >= SearchDefinition.get.tabs.length) {
      return;
    }
    const searchTabConfig = SearchDefinition.get.tabs[tabNum];

    const index = CompendiumIndex.get.indexFor(searchTabConfig);
    if (!index) {
      return;
    }

    // const searchObject = this.#createSearchObject(searchTabConfig, parentTab);
    // index.searchAsync();
  }

  // @ts-expect-error
  #createSearchObject(
    tab: TabDefinition,
    filterElement: HTMLElement
  ): Partial<DocumentSearchOptions<false>>[] {
    const res: Partial<DocumentSearchOptions<false>>[] = [];

    for (const key of Object.keys(tab.schema)) {
      const inputs = Array.from(
        filterElement.querySelectorAll<HTMLInputElement>(`input[data-cs-field="${key}"]`).values()
      );

      const field = tab.schema[key];
      switch (field.kind) {
        case "searchable":
          if (inputs.length !== 1) {
            throw Error(
              `Incorrect number of inputs for searchable field: ${field.title}: ${inputs.length}`
            );
          }
          break;
        case "selectable":
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
          break;
        case "range":
          // sanity check
          if (field.type !== "number") {
            // @ts-expect-error
            throw Error(`Invalid type for range field: ${field.title}: ${field.type}`);
          }
          break;
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
