import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerCharacters() {
  SearchDefinition.get.registerSearchTab({
    id: "characters",
    title: "CS.dnd5e.characters.title",
    icon: "fa-solid fa-head-side",
    type: "Item",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/character.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.characters.name",
        type: "string",
        kind: "searchable",
      },
      description: {
        title: "CS.dnd5e.characters.description",
        type: "string",
        kind: "searchable",
      },
      category: {
        title: "CS.dnd5e.characters.category.title",
        type: "string",
        kind: "selectable",
        options: {
          class: "CS.dnd5e.characters.category.class",
          subclass: "CS.dnd5e.characters.category.subclass",
          race: "CS.dnd5e.characters.category.race",
          background: "CS.dnd5e.characters.category.background",
        },
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!CHARACTER_TYPES.has((doc as any).type)) {
        return null;
      }

      if (!isCharacterFeature(doc)) {
        return null;
      }
      return {
        name: doc.name,
        description: doc.system.description.value,
        category: doc.type,
      };
    },
  });
}

const CHARACTER_TYPES = new Set(["class", "subclass", "race", "background"]);

type Item5e = CompendiumDoc & {
  name: string;
  type: string;
  system: FeatureData;
};

interface FeatureData {
  description: DescriptionData;
}
interface DescriptionData {
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isCharacterFeature(value: any): value is Item5e {
  return (
    exists(value?.name) &&
    exists(value.system?.description?.value) &&
    typeof value.name === "string" &&
    typeof value.system.description.value === "string"
  );
}
