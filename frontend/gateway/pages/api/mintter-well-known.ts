import {daemonClient, networkingClient} from '../../client'
import {NextRequest, NextResponse} from 'next/server'

export default async function handler(req: NextRequest, res: NextResponse) {
  const info = await daemonClient.getInfo({})
  const peerInfo = await networkingClient.getPeerInfo({peerId: info.peerId})

  const wellKnown = {
    account_id: info.accountId,
    addresses: peerInfo.addrs,
  }
  return new Response(JSON.stringify(wellKnown), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
