export function tauriEncodeParam(p: string): string {
  return p
    .replaceAll('.', '---DOT---')
    .replaceAll('/', '---SLASH---')
    .replaceAll(':', '---COLON---')
}
export function tauriDecodeParam(p?: string): string | undefined {
  if (!p) return p
  return p
    .replaceAll('---DOT---', '.')
    .replaceAll('---SLASH---', '/')
    .replaceAll('---COLON---', ':')
}
