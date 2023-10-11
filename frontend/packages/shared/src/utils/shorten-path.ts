export function shortenPath(input: string) {
  return input.length > 40 ? `${input.substring(0, 40)}...` : input
}
