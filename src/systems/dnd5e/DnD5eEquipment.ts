import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerEquipment() {
  SearchDefinition.get.registerSearchTab({
    title: "CS.dnd5e.equip.title",
    icon: "fa-solid fa-hammer",
    type: "Item",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/equip.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.equip.name",
        type: "string",
        kind: "searchable",
      },
      description: {
        title: "CS.dnd5e.equip.description",
        type: "string",
        kind: "searchable",
      },
      type: {
        title: "CS.dnd5e.equip.type.title",
        type: "string",
        kind: "selectable",
        options: {
          armor: "CS.dnd5e.equip.type.armor",
          shield: "CS.dnd5e.equip.type.shield",
          clothing: "CS.dnd5e.equip.type.clothing",
          tool: "CS.dnd5e.equip.type.tool",
          trinket: "CS.dnd5e.equip.type.trinket",
          container: "CS.dnd5e.equip.type.container",
          loot: "CS.dnd5e.equip.type.loot",
        },
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!ITEM_TYPES.has((doc as any).type)) {
        return null;
      }

      if (!exists(doc.name)) {
        return null;
      }
      if (!isEquip(doc)) {
        return null;
      }

      const type = doc.system.type?.value
      return {
        name: doc.name,
        description: doc.system.description.value,
        type: doc.type === "container" ? "container"
          : doc.type === "loot" ? "loot"
          : doc.type === "tool" ? "tool"
          : type === undefined ? "other"
          : ARMOR_TYPES.has(type) ? "armor"
          : type,
      };
    },
  });
}

const ITEM_TYPES = new Set(["equipment", "container", "loot", "tool"]);
const ARMOR_TYPES = new Set(["light", "medium", "heavy"]);

type Item5e = CompendiumDoc & {
  type: string,
  system: EquipmentData;
};

interface EquipmentData {
  description: DescriptionData;
  type?: ItemTypeData | undefined;
}
interface DescriptionData {
  value: string;
}
interface ItemTypeData {
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isEquip(value: any): value is Item5e {
  return (
    exists(value?.system?.description?.value) &&
    typeof value.system.description.value === "string" &&
    exists(value.system.type?.value) ? typeof value.system.type.value === "string"
      : true
  );
}
