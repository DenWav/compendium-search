// language=HTML
export function createElement<
  HTML extends string,
  E extends HTML extends `<button${string}` ? HTMLButtonElement
  : HTML extends `<input${string}` ? HTMLInputElement
  : HTML extends `<li${string}` ? HTMLLIElement
  : HTML extends `<label${string}` ? HTMLLabelElement
  : HTML extends `<div${string}` ? HTMLDivElement
  : HTMLElement,
>(text: HTML): E {
  const template = document.createElement("template");
  template.innerHTML = text;
  return template.content.children[0] as E;
}

export function* chunkify<T>(a: T[], size: number) {
  let i: number = 0;
  while (i < a.length) {
    const end = Math.min(i + size, a.length);
    yield a.slice(i, end);
    i = end;
  }
}

export function exists<T>(value: T | null | undefined): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export function getOrDefault<K, V>(map: Map<K, V>, key: K, defaultValue: () => V): V {
  const currentValue = map.get(key);
  if (currentValue !== undefined) {
    return currentValue;
  } else {
    const newValue = defaultValue();
    map.set(key, newValue);
    return newValue;
  }
}

export function reduceResults<K, V, ID, R>(
  map: Map<K, V[]>,
  getElements: (value: V) => R[],
  getId: (value: R) => ID
) {
  const groupSets: Set<R>[] = [];
  for (const group of map.values()) {
    // merge groups of the same field
    groupSets.push(new Set(group.flatMap(getElements)));
  }

  const reducers = groupSets.map(g => g.map(getId));
  const reduced = reducers.reduce((acc, current) => {
    if (acc.size === 0) {
      return current;
    } else {
      return acc.intersection(current);
    }
  }, new Set<ID>());

  return groupSets.reduce((acc, current) => {
    current.forEach(value => {
      if (reduced.has(getId(value))) {
        acc.add(value);
      }
    });
    return acc;
  }, new Set<R>());
}

export function sortField(
  field: string,
  dir: "asc" | "desc",
  type: "string" | "number" | "boolean"
): (left: Record<string, string>, right: Record<string, string>) => number {
  switch (type) {
    case "string":
      return sortWithCollator(
        field,
        dir,
        new Intl.Collator("en", { sensitivity: "base", ignorePunctuation: true })
      );
    case "number":
      return sortWithCollator(field, dir, new Intl.Collator("en", { numeric: true }));
    case "boolean":
      return (left, right) => {
        if (field in left && field in right) {
          // "asc" => true first
          // "desc" => false first
          switch (dir) {
            case "asc":
              return (
                left[field] === "true" ? -1
                : right[field] === "true" ? 1
                : 0
              );
            case "desc":
              return (
                left[field] === "false" ? -1
                : right[field] === "false" ? 1
                : 0
              );
          }
        } else {
          return 0;
        }
      };
  }
}

export function sortWithCollator(
  field: string,
  dir: "asc" | "desc",
  collator: Intl.Collator
): (left: Record<string, string>, right: Record<string, string>) => number {
  return (left, right) => {
    const leftValue: string | undefined =
      `${field}$real` in left ? left[`${field}$real`] : left[field];
    const rightValue: string | undefined =
      `${field}$real` in right ? right[`${field}$real`] : right[field];
    if (leftValue !== undefined && rightValue !== undefined) {
      switch (dir) {
        case "asc":
          return collator.compare(leftValue, rightValue);
        case "desc":
          return collator.compare(rightValue, leftValue);
      }
    } else {
      return 0;
    }
  };
}
