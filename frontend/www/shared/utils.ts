export function getRandomElements(arr: string[], items = 3): number[] {
  // create a list ob objects with its index
  const objs = arr.map((item, i) => ({index: i, word: item}))
  // map the index, sort and slice.
  return objs
    .map(item => item.index)
    .sort(() => (Math.random() > 0.5 ? -1 : 1))
    .slice(0, items)
}
