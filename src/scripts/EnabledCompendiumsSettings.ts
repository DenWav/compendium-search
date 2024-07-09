import type {DeepPartial} from '@league-of-foundry-developers/foundry-vtt-types/src/types/utils.mjs';
import type {
  ApplicationConfiguration,
  ApplicationRenderContext,
  ApplicationRenderOptions,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/client-esm/applications/_types.mjs';

const {ApplicationV2, HandlebarsApplicationMixin} = foundry.applications.api;

export class EnabledCompendiumsSettings extends HandlebarsApplicationMixin(
  ApplicationV2
) {
  data: string[];
  tree: CompendiumTree | null;

  static override DEFAULT_OPTIONS = {
    id: 'compendium-search-enabled-compendiums-app',
    tag: 'form',
    form: {
      handler: EnabledCompendiumsSettings.formHandler,
      submitOnChange: false,
      closeOnSubmit: true,
    },
    window: {
      title: 'Compendium Search - Enabled Compendiums',
      resizable: true,
    },
    position: {
      width: 500,
      height: 800,
    },
  };

  static override PARTS = {
    settings: {
      template: 'modules/compendium-search/template/enabled-compendiums.hbs',
    },
  };

  constructor(options: DeepPartial<ApplicationConfiguration>) {
    super(options);
    if (game.settings && game.packs) {
      this.data = game.settings.get(
        'compendium-search',
        'enabled-compendiums'
      ) as string[];
      // @ts-expect-error
      this.tree = game.packs?.tree;
    } else {
      this.data = [];
      this.tree = null;
    }
  }

  protected override _onRender(
    context: DeepPartial<ApplicationRenderContext>,
    options: DeepPartial<ApplicationRenderOptions>
  ) {
    super._onRender(context, options);

    const app = $('#compendium-search-enabled-compendiums-app-content');
    const list = $('<ul></ul>');

    if (this.tree) {
      this.buildList([], list, this.tree);
    }
    app.append(list);
  }

  static async formHandler(
    _event: SubmitEvent,
    form: HTMLFormElement,
    _formData: FormDataExtended
  ) {
    if (!game.settings) {
      return;
    }

    const result: string[] = [];

    const elements = form.getElementsByTagName('input');
    for (const element of elements) {
      if (element.checked && element.dataset.compendiumId) {
        result.push(element.dataset.compendiumId);
      }
    }

    await game.settings.set('compendium-search', 'enabled-compendiums', result);
  }

  private buildList(
    depth: number[],
    list: JQuery<HTMLElement>,
    current: CompendiumTree
  ) {
    let count = 0;
    for (const childTree of current.children) {
      const childList = $('<ul></ul>');
      this.buildList([...depth, count], childList, childTree);

      let listItem: JQuery<HTMLElement>;
      if (childTree.folder) {
        // @ts-expect-error
        const cssColor = childTree.folder.color.toRGBA(0.85);
        listItem = $(`<li style="background-color: ${cssColor};"></li>`);

        const folderId = this.computeId([...depth, count]);
        const folderItem: JQuery<HTMLInputElement> = $(
          `<input type="checkbox" id="${folderId}" />`
        );
        folderItem.on('change', event => {
          const isChecked = event.currentTarget.checked;
          childList.find('input').each((_, elem) => {
            elem.checked = isChecked;
          });

          if (!isChecked) {
            this.uncheckParents(depth);
          }
        });

        const childInputs = Array.from(childList.find('input'));
        const isAllChecked = childInputs.every(elem => elem.checked);
        if (childInputs.length > 0 && isAllChecked) {
          (folderItem[0] as HTMLInputElement).checked = true;
        }

        listItem.append(folderItem);
        listItem.append(
          `<label for="${folderId}">${childTree.folder.name}</label>`
        );
      } else {
        listItem = $('<li></li>');
      }

      listItem.append(childList);
      list.append(listItem);

      count++;
    }

    for (const entry of current.entries) {
      const label = entry.metadata.label;
      const entryId = this.computeId([...depth, count]);

      const listElement = $('<li></li>');
      const entryItem = $(
        `<input type="checkbox" id="${entryId}" data-compendium-id="${entry.metadata.id}" />`
      );
      entryItem.on('change', () => {
        this.uncheckParents(depth);
      });

      listElement.append(entryItem);
      listElement.append(`<label for="${entryId}">${label}</label>`);
      list.append(listElement);

      if (this.data.includes(entry.metadata.id)) {
        (entryItem[0] as HTMLInputElement).checked = true;
      }

      count++;
    }
  }

  private uncheckParents(depth: number[]) {
    for (let i = 0; i < depth.length; i++) {
      const parentId = this.computeId(depth.slice(0, i === 0 ? undefined : -i));
      (document.getElementById(parentId) as HTMLInputElement).checked = false;
    }
  }

  private computeId(depth: number[]): string {
    let id = 'cs-comp-select';
    for (const d of depth) {
      id += `-${d}`;
    }
    return id;
  }
}
