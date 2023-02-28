import {getInfo, listPeerAddrs} from '@mintter/shared'
import {NextRequest, NextResponse} from 'next/server'
import {transport} from '../../client'

export default async function handler(req: NextRequest, res: NextResponse) {
  const info = await getInfo(transport)
  const addresses = await listPeerAddrs(info.peerId, transport)
  const wellKnown = {
    account_id: info.accountId,
    addresses,
  }
  return new Response(JSON.stringify(wellKnown), {
    headers: {
      'Content-Type': 'application/json',
    },
  })
}
