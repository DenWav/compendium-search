import {EnabledCompendiumsSettings} from './EnabledCompendiumsSettings.js';
import {CompendiumSearch} from './CompendiumSearch.js';

Hooks.on('ready', () => {
  if (!game.settings) {
    return;
  }

  game.settings.registerMenu('compendium-search', 'enabled-compendiums-menu', {
    name: 'Compendiums Enabled',
    label: 'Configure',
    hint: 'Compendiums to include in searches',
    icon: 'fas fa-bars',
    // @ts-expect-error
    type: EnabledCompendiumsSettings,
    restricted: true,
  });

  game.settings.register('compendium-search', 'enabled-compendiums', {
    scope: 'world',
    config: false,
    type: Array,
    default: [],
  });
});

Hooks.on('renderCompendiumDirectory', () => {
  if (!game.i18n) {
    return;
  }

  const html = $('#compendium');
  const searchButton = $(
    `<button class="compendium-search-btn"><i class="fas fa-fire"></i> ${game.i18n.localize('CompendiumSearch.compendiumSearch')}</button>`
  );

  html.find('.compendium-browser-btn').remove();
  html.find('.directory-footer').append(searchButton);

  searchButton.on('click', event => {
    event.preventDefault();
    new CompendiumSearch().render(true);
  });
});
