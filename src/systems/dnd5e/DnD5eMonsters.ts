import { CompendiumDoc, SearchDefinition } from "../../SearchDefinition.js";
import { exists } from "../../util.js";

export function registerMonsters() {
  SearchDefinition.get.registerSearchTab({
    title: "CS.dnd5e.monster.title",
    icon: "fa-solid fa-paw-claws",
    type: "Actor",
    resultTemplate: "modules/compendium-search/template/partial/dnd5e/monster.hbs",
    schema: {
      name: {
        title: "CS.dnd5e.monster.name",
        type: "string",
        kind: "searchable",
      },
      biography: {
        title: "CS.dnd5e.monster.bio",
        type: "string",
        kind: "searchable",
      },
      type: {
        title: "CS.dnd5e.monster.type.title",
        type: "string",
        kind: "selectable",
        options: {
          aberration: "CS.dnd5e.monster.type.aberration",
          beast: "CS.dnd5e.monster.type.beast",
          celestial: "CS.dnd5e.monster.type.celestial",
          construct: "CS.dnd5e.monster.type.construct",
          dragon: "CS.dnd5e.monster.type.dragon",
          elemental: "CS.dnd5e.monster.type.elemental",
          fey: "CS.dnd5e.monster.type.fey",
          fiend: "CS.dnd5e.monster.type.fiend",
          giant: "CS.dnd5e.monster.type.giant",
          humanoid: "CS.dnd5e.monster.type.humanoid",
          monstrosity: "CS.dnd5e.monster.type.monstrosity",
          ooze: "CS.dnd5e.monster.type.ooze",
          plant: "CS.dnd5e.monster.type.plant",
          undead: "CS.dnd5e.monster.type.undead",
        },
      },
      cr: {
        title: "CS.dnd5e.monster.cr",
        type: "number",
        kind: "range",
        min: 0,
        max: 20,
        step: 1,
      },
    },
    mapper: async doc => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((doc as any).type !== "npc") {
        return null;
      }
      if (!exists(doc.name)) {
        return null;
      }
      if (!isActor5e(doc)) {
        return null;
      }

      return {
        name: doc.name,
        biography: doc.system.details.biography.value,
        type: doc.system.details.type.value,
        cr: doc.system.details.cr,
      };
    },
  });
}

type Actor5e = CompendiumDoc & {
  system: NPCData;
};
interface NPCData {
  details: NPCDetails;
}
interface NPCDetails {
  biography: BiographyData;
  type: NPCType;
  cr: number;
}
interface BiographyData {
  value: string;
}
interface NPCType {
  value: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isActor5e(value: any): value is Actor5e {
  return (
    exists(value?.system?.details?.biography?.value) &&
    exists(value.system.details.type?.value) &&
    exists(value.system.details.cr) &&
    typeof value.system.details.biography.value === "string" &&
    typeof value.system.details.type.value === "string" &&
    typeof value.system.details.cr === "number"
  );
}
