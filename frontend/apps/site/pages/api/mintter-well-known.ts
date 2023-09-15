import {daemonClient, networkingClient} from '../../client'
import {NextApiRequest, NextApiResponse} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {SiteDiscoveryConfig} from '@mintter/shared'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const info = await daemonClient.getInfo({})
  const peerInfo = await networkingClient.getPeerInfo({
    deviceId: info.deviceId,
  })
  const wellKnown = new SiteDiscoveryConfig({
    accountId: info.accountId,
    peerId: info.deviceId,
    addresses: peerInfo.addrs,
  }).toJson()

  setAllowAnyHostGetCORS(res)
  res
    .status(200)
    .setHeader('Content-Type', 'application/json')
    .send(JSON.stringify(wellKnown, null, 2))
}
