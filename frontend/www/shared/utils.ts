export function getRandom3(arr: string[]): number[] {
  const res = []
  const objs = arr.map((w, i) => ({index: i, word: w}))
  for (let x = 1; x <= 3; x++) {
    const random = Math.floor(Math.random() * objs.length)
    // console.log('random => ', random)
    res.push(objs[random].index)
    objs.splice(random, 1)
  }

  return res
}
