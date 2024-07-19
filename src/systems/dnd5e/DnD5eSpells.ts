import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerSpells() {
  SearchDefinition.get.registerSearchTab({
    title: "CS.dnd5e.spells.title",
    icon: "fa-solid fa-wand-magic-sparkles",
    type: "Item",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/spells.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.spells.name",
        type: "string",
        kind: "searchable",
      },
      description: {
        title: "CS.dnd5e.spells.description",
        type: "string",
        kind: "searchable",
      },
      level: {
        title: "CS.dnd5e.spells.level",
        type: "number",
        kind: "range",
        min: 0,
        max: 9,
        step: 1,
      },
      school: {
        title: "CS.dnd5e.spells.school.title",
        type: "string",
        kind: "selectable",
        options: {
          abj: "CS.dnd5e.spells.school.abj",
          con: "CS.dnd5e.spells.school.con",
          div: "CS.dnd5e.spells.school.div",
          enc: "CS.dnd5e.spells.school.enc",
          evo: "CS.dnd5e.spells.school.evo",
          ill: "CS.dnd5e.spells.school.ill",
          nec: "CS.dnd5e.spells.school.nec",
          trs: "CS.dnd5e.spells.school.trs",
        },
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((doc as any).type !== "spell") {
        return null;
      }

      if (!exists(doc.name)) {
        return null;
      }
      if (!isSpell(doc)) {
        return null;
      }
      return {
        name: doc.name,
        description: doc.system.description.value,
        school: doc.system.school,
        level: doc.system.level,
      };
    },
  });
}

type Item5e = CompendiumDoc & {
  system: SpellData;
};

interface SpellData {
  description: DescriptionData;
  school: string;
  level: number;
}
interface DescriptionData {
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isSpell(value: any): value is Item5e {
  return (
    exists(value?.system?.description?.value) &&
    exists(value.system.school) &&
    exists(value.system.level) &&
    typeof value.system.description.value === "string" &&
    typeof value.system.school === "string" &&
    typeof value.system.level === "number"
  );
}
