import type { StoredDocument, ValueOf } from "@foundry/types/utils.mjs";
import type { DocumentInstanceForCompendiumMetadata } from "@foundry/client/data/collections/compendium-collection.mjs";
import { CompendiumIndex } from "./CompendiumIndex";

export type CompendiumDoc = StoredDocument<
  DocumentInstanceForCompendiumMetadata<CompendiumCollection.Metadata>
>;

declare const DOCUMENT_FIELD_TYPES: readonly ["string", "number", "boolean"];
export type DOCUMENT_FIELD_TYPES = ValueOf<typeof DOCUMENT_FIELD_TYPES>;

declare const FIELD_KINDS: readonly ["searchable", "selectable", "range"];
export type FIELD_KINDS = ValueOf<typeof FIELD_KINDS>;

interface BaseFieldDescriptor<T extends DOCUMENT_FIELD_TYPES, K extends FIELD_KINDS> {
  title: string;
  type: T;
  kind: K;
}

export type SearchableStringFieldDescriptor = BaseFieldDescriptor<"string", "searchable">;

export interface SelectableStringFieldDescriptor
  extends BaseFieldDescriptor<"string", "selectable"> {
  options: Record<string, string>;
}

export interface SelectableNumberFieldDescriptor
  extends BaseFieldDescriptor<"number", "selectable"> {
  options: Record<number, string>;
}

export type int = number;
export interface RangeNumberFieldDescriptor extends BaseFieldDescriptor<"number", "range"> {
  min: int;
  max: int;
  step: int;
}

export interface BooleanFieldDescriptor extends BaseFieldDescriptor<"boolean", "selectable"> {
  optionTitle: string;
}

export type FieldDescriptor =
  | SelectableStringFieldDescriptor
  | SearchableStringFieldDescriptor
  | SelectableNumberFieldDescriptor
  | RangeNumberFieldDescriptor
  | BooleanFieldDescriptor;

export type FromFieldType<T extends DOCUMENT_FIELD_TYPES> =
  T extends "string" ? string
  : T extends "number" ? number
  : T extends "boolean" ? boolean
  : never;

export type ForSchema<T extends Record<string, FieldDescriptor> = Record<string, FieldDescriptor>> =
  {
    [Key in keyof T]: FromFieldType<T[Key]["type"]> | null;
  };

export interface TabDefinition<
  Schema extends Record<string, FieldDescriptor> = Record<string, FieldDescriptor>,
> {
  title: string;
  icon: string;
  type: foundry.CONST.COMPENDIUM_DOCUMENT_TYPES;
  resultTemplate: string;

  schema: Schema;

  mapper: (doc: CompendiumDoc) => Promise<ForSchema<Schema> | null>;
}

export class SearchDefinition {
  static #instance: SearchDefinition | null = null;

  static get get(): SearchDefinition {
    if (SearchDefinition.#instance) {
      return SearchDefinition.#instance;
    }
    const def = new SearchDefinition();
    SearchDefinition.#instance = def;
    return def;
  }

  #tabDefs: TabDefinition[] = [];

  get tabs(): TabDefinition[] {
    return this.#tabDefs;
  }

  registerSearchTab<Schema extends Record<string, FieldDescriptor>>(def: TabDefinition<Schema>) {
    function localize(value: string): string {
      if (game.i18n) {
        return game.i18n.localize(value);
      } else {
        return value;
      }
    }

    def.title = localize(def.title);
    for (const field of Object.values(def.schema)) {
      field.title = localize(field.title);
      if ("optionTitle" in field) {
        field.optionTitle = localize(field.optionTitle);
      }
      if ("options" in field) {
        for (const [key, optionValue] of Object.entries(field.options)) {
          (field.options as Record<string, string>)[key] = localize(optionValue);
        }
      }
    }

    this.#tabDefs.push(def);
    CompendiumIndex.get.markNeedsRebuild();
  }
}
