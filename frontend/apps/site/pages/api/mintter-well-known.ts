import {daemonClient, networkingClient} from '../../client'
import {NextRequest, NextResponse} from 'next/server'

export default async function handler(req: NextRequest, res: NextResponse) {
  const info = await daemonClient.getInfo({})
  console.log('🚀 ~ file: mintter-well-known.ts:6 ~ handler ~ info:', info)
  const peerInfo = await networkingClient.getPeerInfo({peerId: info.peerId})
  console.log(
    '🚀 ~ file: mintter-well-known.ts:8 ~ handler ~ peerInfo:',
    peerInfo,
  )

  const wellKnown = {
    account_id: info.accountId,
    addresses: peerInfo.addrs,
  }
  console.log(
    '🚀 ~ file: mintter-well-known.ts:14 ~ handler ~ wellKnown:',
    wellKnown,
  )
  return new Response(JSON.stringify(wellKnown), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
