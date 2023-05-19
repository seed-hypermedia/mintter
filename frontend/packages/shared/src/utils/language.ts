export function pluralizer(
  count: number,
  singleLabel: string,
  pluralSuffix = 's',
) {
  return count === 1
    ? `1 ${singleLabel}`
    : `${count} ${singleLabel}${pluralSuffix}`
}

export function pluralS(length: number | undefined, label: string) {
  return `${label}${length === 1 ? '' : 's'}`
}
