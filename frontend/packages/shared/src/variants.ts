type GroupEntry = {
  groupId: string
  pathName: string | null
}
export function groupsVariantsMatch(
  a: undefined | GroupEntry[],
  b: undefined | GroupEntry[],
) {
  if (!a && !b) return true
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((aEntry) =>
    b.some(
      (bEntry) =>
        aEntry.groupId === bEntry.groupId &&
        aEntry.pathName === bEntry.pathName,
    ),
  )
}

export function stringArrayMatch(a: string[], b: string[]) {
  const sortedB = b.slice().sort()
  return (
    a.length === b.length &&
    a
      .slice()
      .sort()
      .every((val, index) => val === sortedB[index])
  )
}
