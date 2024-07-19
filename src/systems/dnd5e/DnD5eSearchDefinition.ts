import { registerMonsters } from "./DnD5eMonsters.js";
import { registerArmor } from "./DnD5eArmor.js";
import { registerWeapons } from "./DND5eWeapons.js";
import { registerConsumables } from "./DnD5eConsumables.js";
import {registerSpells} from "./DnD5eSpells";
import {registerEquipment} from "./DnD5eEquipment";
import {registerFeatures} from "./DnD5eFeatures";
import {registerCharacters} from "./DnD5eCharacters";

export function registerDnd5e() {
  registerWeapons();
  registerArmor();
  registerEquipment();
  registerConsumables();
  registerSpells()
  registerCharacters()
  registerFeatures()
  registerMonsters();
}
