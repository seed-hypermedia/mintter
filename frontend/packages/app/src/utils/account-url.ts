export function getAccountUrl(accountId: string, host?: string): string {
  const urlHost = host || 'https://mintter.com'
  const url = `${urlHost}/a/${accountId}`
  return url
}
