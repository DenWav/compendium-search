import { EnabledCompendiumsSettings } from "./ui/EnabledCompendiumsSettings";
import { CompendiumSearch } from "./ui/CompendiumSearch";
import { registerDnd5e } from "./systems/dnd5e/DnD5eSearchDefinition";
import { createElement } from "./util";

Hooks.on("i18nInit", () => {
  if (!game.system) {
    return;
  }

  switch (game.system.id) {
    case "dnd5e": {
      registerDnd5e();
      break;
    }
  }
});

Hooks.on("ready", () => {
  if (!game.settings) {
    return;
  }

  game.settings.registerMenu("compendium-search", "enabled-compendiums-menu", {
    name: "Compendiums Enabled",
    label: "Configure",
    hint: "Compendiums to include in searches",
    icon: "fa-solid fa-bars",
    type: EnabledCompendiumsSettings,
    restricted: true,
  });

  game.settings.register("compendium-search", "enabled-compendiums", {
    scope: "world",
    config: false,
    type: Array,
    default: [],
  });
});

Hooks.on("setup", () => {
  const request = window.indexedDB.open("compendium-search", 1);
  request.onupgradeneeded = (event) => {
    // @ts-expect-error
    const db: IDBDatabase = event.target.result;
    db.createObjectStore("indices");
  };
});

Hooks.on("renderCompendiumDirectory", () => {
  if (!game.i18n) {
    return;
  }

  const html = document.getElementById("compendium");
  if (!html) {
    return;
  }

  const searchButton = createElement(
    `<button class="compendium-search-btn"><i class="fa-solid fa-magnifying-glass"></i> ${game.i18n.localize("CS.title")}</button>`
  );

  html.querySelectorAll(".compendium-browser-btn").forEach(e => e.remove());
  html.querySelector(".directory-footer")?.append(searchButton);

  searchButton.onclick = async event => {
    event.preventDefault();
    await new CompendiumSearch().render(true);
  };
});
