import type {
  ApplicationConfiguration,
  ApplicationRenderContext,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/applications/_types.mjs';
import type {DeepPartial} from '@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs';
import {CompendiumIndex} from './CompendiumIndex';

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class CompendiumSearch extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  static override DEFAULT_OPTIONS = {
    id: 'compendium-search-app',
    window: {
      title: 'Compendium Search',
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

  static override PARTS = {
    search: {
      template: 'modules/compendium-search/template/compendium-search.hbs',
    },
  };

  constructor(options: DeepPartial<ApplicationConfiguration> = {}) {
    super(options);
  }

  protected override async _prepareContext(
    _options: DeepPartial<ApplicationConfiguration>
  ): Promise<ApplicationRenderContext> {
    if (!game.packs) {
      return {};
    }

    // @ts-expect-error
    const tree: CompendiumTree = game.packs.tree;
    return {};
  }

  static async rebuildIndex(_event: Event, _element: HTMLButtonElement) {
    const index = CompendiumIndex.get();
    await index.rebuild();
  }
}
