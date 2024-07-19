import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerConsumables() {
  SearchDefinition.get.registerSearchTab({
    title: "CS.dnd5e.consumable.title",
    icon: "fa-solid fa-flask-round-potion",
    type: "Item",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/consumable.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.consumable.name",
        type: "string",
        kind: "searchable",
      },
      description: {
        title: "CS.dnd5e.consumable.description",
        type: "string",
        kind: "searchable",
      },
      type: {
        title: "CS.dnd5e.consumable.type.title",
        type: "string",
        kind: "selectable",
        options: {
          potion: "CS.dnd5e.consumable.type.potion",
          food: "CS.dnd5e.consumable.type.food",
          trinket: "CS.dnd5e.consumable.type.trinket",
          rod: "CS.dnd5e.consumable.type.rod",
          wand: "CS.dnd5e.consumable.type.wand",
          scroll: "CS.dnd5e.consumable.type.scroll",
          poison: "CS.dnd5e.consumable.type.poison",
          ammo: "CS.dnd5e.consumable.type.ammo",
        },
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((doc as any).type !== "consumable") {
        return null;
      }

      if (!exists(doc.name)) {
        return null;
      }
      if (!isConsumable(doc)) {
        return null;
      }
      return {
        name: doc.name,
        description: doc.system.description.value,
        type: doc.system.type.value,
      };
    },
  });
}

type Item5e = CompendiumDoc & {
  system: ConsumableData;
};

interface ConsumableData {
  description: DescriptionData;
  type: ItemTypeData;
}
interface DescriptionData {
  value: string;
}
interface ItemTypeData {
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isConsumable(value: any): value is Item5e {
  return (
    exists(value?.system?.description?.value) &&
    exists(value.system.type?.value) &&
    typeof value.system.description.value === "string" &&
    typeof value.system.type.value === "string"
  );
}
