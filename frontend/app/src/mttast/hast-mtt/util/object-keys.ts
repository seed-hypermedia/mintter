export function ObjectKeys<Obj>(obj: Obj): (keyof Obj)[] {
  return Object.keys(obj) as (keyof Obj)[]
}
