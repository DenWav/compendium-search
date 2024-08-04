import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerWeapons() {
  SearchDefinition.get.registerSearchTab({
    id: "weapons",
    title: "CS.dnd5e.weapon.title",
    icon: "fa-solid fa-sword",
    type: "Item",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/weapon.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.weapon.name",
        type: "string",
        kind: "searchable",
      },
      description: {
        title: "CS.dnd5e.weapon.description",
        type: "string",
        kind: "searchable",
      },
      type: {
        title: "CS.dnd5e.weapon.type.title",
        type: "string",
        kind: "selectable",
        options: {
          simpleM: "CS.dnd5e.weapon.type.simpleM",
          simpleR: "CS.dnd5e.weapon.type.simpleR",
          martialM: "CS.dnd5e.weapon.type.martialM",
          martialR: "CS.dnd5e.weapon.type.martialR",
          natural: "CS.dnd5e.weapon.type.natural",
        },
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((doc as any).type !== "weapon") {
        return null;
      }
      if (!isWeapon(doc)) {
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

// @ts-ignore
type Item5e = CompendiumDoc & {
  name: string;
  system: WeaponData;
};

interface WeaponData {
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
function isWeapon(value: any): value is Item5e {
  return (
    exists(value?.name) &&
    exists(value.system?.description?.value) &&
    exists(value.system.type?.value) &&
    typeof value.name &&
    typeof value.system.description.value === "string" &&
    typeof value.system.type.value === "string"
  );
}
