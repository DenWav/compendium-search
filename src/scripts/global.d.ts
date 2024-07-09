declare global {
  namespace ClientSettings {
    interface Values {
      'compendium-search.enabled-compendiums': string[];
    }
  }
}

type CompendiumTree = DirectoryCollection.TreeNode<
  CompendiumCollection<CompendiumCollection.Metadata>
>;
