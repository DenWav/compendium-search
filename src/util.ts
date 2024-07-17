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
