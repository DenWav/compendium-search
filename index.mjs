function rerenderApps(path) {
  const apps = [...Object.values(ui.windows), ...foundry.applications.instances.values(), ui.sidebar];
  for (const app of apps) {
    app.render();
  }
}

// HMR for template files
import.meta.hot.on("lang-update", async ({path}) => {
  const lang = await foundry.utils.fetchJsonWithTimeout(path);
  if (!!!lang || Object.getPrototypeOf(lang) !== Object.prototype) {
    ui.notifications.error(`Failed to load ${path}`);
    return;
  }
  const apply = () => {
    foundry.utils.mergeObject(game.i18n.translations, lang);
    rerenderApps(path);
  };
  if (game.ready) {
    apply();
  } else {
    Hooks.once("ready", apply);
  }
});

import.meta.hot.on("template-update", async ({path}) => {
  const apply = async () => {
    delete Handlebars.partials[path];
    await getTemplate(path);
    rerenderApps(path);
  };
  if (game.ready) {
    apply();
  } else {
    Hooks.once("ready", apply);
  }
});

/** This file is for a running the Vite dev server and is not copied to a build */
import "./src/index.ts";
