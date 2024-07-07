type CompendiumTree = {
  children: CompendiumTree[]
  entries: CompendiumCollection<CompendiumCollection.Metadata>[]
  folder: Folder | null
  depth: number
  root: boolean
  visible: boolean
}

declare global {
  namespace ClientSettings {
    interface Values {
      'compendium-search.enabled-compendiums': string[];
    }
  }
}

