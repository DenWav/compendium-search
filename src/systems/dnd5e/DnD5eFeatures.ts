import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerFeatures() {
  SearchDefinition.get.registerSearchTab({
    id: "features",
    title: "CS.dnd5e.feats.title",
    icon: "fa-solid fa-dice-d20",
    type: "Item",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/features.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.feats.name",
        type: "string",
        kind: "searchable",
      },
      description: {
        title: "CS.dnd5e.feats.description",
        type: "string",
        kind: "searchable",
      },
      category: {
        title: "CS.dnd5e.feats.category.title",
        type: "string",
        kind: "selectable",
        options: {
          class: "CS.dnd5e.feats.category.classFeature",
          background: "CS.dnd5e.feats.category.backgroundFeature",
          race: "CS.dnd5e.feats.category.raceFeature",
          enchantment: "CS.dnd5e.feats.category.enchantment",
          monster: "CS.dnd5e.feats.category.monsterFeature",
        },
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((doc as any).type !== "feat") {
        return null;
      }

      if (!isFeature(doc)) {
        return null;
      }
      return {
        name: doc.name,
        description: doc.system.description.value,
        category: doc.system.type.value,
      };
    },
  });
}

type Item5e = CompendiumDoc & {
  name: string;
  system: FeatureData;
};

interface FeatureData {
  type: FeatureTypeData;
  description: DescriptionData;
}
interface FeatureTypeData {
  value: string;
}
interface DescriptionData {
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isFeature(value: any): value is Item5e {
  return (
    exists(value?.name) &&
    exists(value.system?.description?.value) &&
    exists(value?.system?.type?.value) &&
    typeof value.name === "string" &&
    typeof value.system.description.value === "string" &&
    typeof value.system.type.value === "string"
  );
}
