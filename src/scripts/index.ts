import {EnabledCompendiumsSettings} from './EnabledCompendiumsSettings.js'
import {readyGame} from "./util.js";

Hooks.on('ready', () => {
  const settings = readyGame().settings
  settings.registerMenu('compendium-search', 'enabled-compendiums-menu', {
    name: 'Compendiums Enabled',
    label: 'Configure',
    hint: 'Compendiums to include in searches',
    icon: 'fas fa-bars',
    // @ts-ignore
    type: EnabledCompendiumsSettings,
    restricted: true
  });

  settings.register('compendium-search', 'enabled-compendiums', {
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });
})
