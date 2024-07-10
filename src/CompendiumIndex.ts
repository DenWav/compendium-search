import type {IndexTypeForMetadata} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client/data/collections/compendium-collection.mjs';

export class CompendiumIndex {
  static #instance: CompendiumIndex | null | undefined;

  // @ts-expect-error
  #indices?:
    | IndexTypeForMetadata<CompendiumCollection.Metadata>[]
    | null;

  static get(): CompendiumIndex {
    if (CompendiumIndex.#instance) {
      return CompendiumIndex.#instance;
    }
    const index = new CompendiumIndex();
    CompendiumIndex.#instance = index;
    return index;
  }

  async rebuild() {
    let enabled: string[];
    if (game.settings) {
      enabled = game.settings.get(
        'compendium-search',
        'enabled-compendiums'
      ) as string[];
    } else {
      enabled = [];
    }

    if (!game.packs) {
      return;
    }

    // @ts-expect-error
    const indices: IndexTypeForMetadata<CompendiumCollection.Metadata>[] = [];
    for (const pack of game.packs) {
      if (enabled.includes(pack.metadata.id)) {
        // TODO
      }
    }
  }
}
