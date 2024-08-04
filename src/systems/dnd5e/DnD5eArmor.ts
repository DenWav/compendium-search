import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerArmor() {
  SearchDefinition.get.registerSearchTab({
    id: "armor",
    title: "CS.dnd5e.armor.title",
    icon: "fa-solid fa-shield",
    type: "Item",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/armor.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.armor.name",
        type: "string",
        kind: "searchable",
      },
      description: {
        title: "CS.dnd5e.armor.description",
        type: "string",
        kind: "searchable",
      },
      type: {
        title: "CS.dnd5e.armor.type.title",
        type: "string",
        kind: "selectable",
        options: {
          light: "CS.dnd5e.armor.type.light",
          medium: "CS.dnd5e.armor.type.medium",
          heavy: "CS.dnd5e.armor.type.heavy",
          shield: "CS.dnd5e.armor.type.shield",
        },
      },
      ac: {
        title: "CS.dnd5e.armor.ac",
        type: "number",
        kind: "range",
        min: 0,
        max: 20,
        step: 1,
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((doc as any).type !== "equipment") {
        return null;
      }

      if (!isArmor(doc)) {
        return null;
      }
      return {
        name: doc.name,
        description: doc.system.description.value,
        type: doc.system.type.value,
        ac: doc.system.armor.value,
      };
    },
  });
}

type Item5e = CompendiumDoc & {
  name: string;
  system: EquipmentData;
};

interface EquipmentData {
  description: DescriptionData;
  armor: ArmorData;
  type: ItemTypeData;
}
interface DescriptionData {
  value: string;
}
interface ArmorData {
  value: number;
}
interface ItemTypeData {
  value: string;
}

const ARMOR_TYPES = new Set(["light", "medium", "heavy", "shield"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isArmor(value: any): value is Item5e {
  return (
    exists(value?.name) &&
    exists(value.system?.description?.value) &&
    exists(value.system.armor?.value) &&
    exists(value.system.type?.value) &&
    typeof value.name === "string" &&
    typeof value.system.description.value === "string" &&
    typeof value.system.armor.value === "number" &&
    typeof value.system.type.value === "string" &&
    ARMOR_TYPES.has(value.system.type.value)
  );
}
