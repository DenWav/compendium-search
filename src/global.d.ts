declare global {
  namespace ClientSettings {
    interface Values {
      "compendium-search.enabled-compendiums": string[];
    }
  }
}

type ApplicationTab = {
  /** The ID of the tab. Unique per group. */
  id: string;
  /** The group this tab belongs to. */
  group: string;
  /** An icon to prepend to the tab */
  icon: string;
  /** Display text, will be run through `game.i18n.localize` */
  label: string;
  /** If this is the active tab, set with `this.tabGroups[group] === id` */
  active: boolean;
  /** "active" or "" based on the above boolean */
  cssClass: string;
};

type CompendiumTree = DirectoryCollection.TreeNode<
  CompendiumCollection<CompendiumCollection.Metadata>
>;
