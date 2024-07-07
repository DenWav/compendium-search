export function readyGame(): ReadyGame {
  return game as ReadyGame
}

export function tree(): CompendiumTree {
  // @ts-ignore
  return readyGame().packs?.tree
}
