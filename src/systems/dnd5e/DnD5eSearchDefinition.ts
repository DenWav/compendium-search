import { registerMonsters } from "./DnD5eMonsters";
import { registerArmor } from "./DnD5eArmor";
import { registerWeapons } from "./DND5eWeapons";

export function registerDnd5e() {
  registerWeapons();
  registerArmor();
  registerMonsters();
}
