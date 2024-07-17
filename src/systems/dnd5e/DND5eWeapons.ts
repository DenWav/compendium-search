import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerWeapons() {
  SearchDefinition.get.registerSearchTab({
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
          rod: "CS.dnd5e.weapon.type.rod",
          wand: "CS.dnd5e.weapon.type.wand",
          ammo: "CS.dnd5e.weapon.type.ammo",
          shield: "CS.dnd5e.weapon.type.shield",
        },
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((doc as any).type !== "equipment") {
        return null;
      }
      if (!exists(doc.name)) {
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

const WeaponTypes = new Set([
  "simpleM",
  "simpleR",
  "martialM",
  "martialR",
  "rod",
  "wand",
  "ammo",
  "shield",
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isWeapon(value: any): value is Item5e {
  return (
    exists(value?.system?.description?.value) &&
    exists(value.system.type?.value) &&
    typeof value.system.description.value === "string" &&
    typeof value.system.type.value === "string" &&
    WeaponTypes.has(value.system.type.value)
  );
}
