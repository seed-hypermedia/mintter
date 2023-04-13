import {daemonClient, networkingClient} from '../../client'
import {NextApiRequest, NextApiResponse} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const info = await daemonClient.getInfo({})
  const peerInfo = await networkingClient.getPeerInfo({peerId: info.peerId})
  const wellKnown = {
    account_id: info.accountId,
    addresses: peerInfo.addrs,
  }
  setAllowAnyHostGetCORS(res)
  res.status(200).send(wellKnown)
}
