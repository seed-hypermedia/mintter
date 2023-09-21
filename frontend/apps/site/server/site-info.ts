// const gatewayHostWithProtocol = process.env.HM_BASE_URL
// const gatewayHost = new URL(gatewayHostWithProtocol || '').hostname

export async function getSiteGroup(): Promise<{
  groupEid: string
  version?: string | null
}> {
  // todo, query for site group
  return {
    groupEid: '8ctYvUJwv9kmpjCT4RjBeD',
    version: null,
  }
}
