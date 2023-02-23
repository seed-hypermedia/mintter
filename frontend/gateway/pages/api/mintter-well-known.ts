import {getPeerInfo, listAccounts} from '@mintter/shared'
import {NextRequest, NextResponse} from 'next/server'
import {transport} from '../../client'

export default async function handler(req: NextRequest, res: NextResponse) {
  console.log('Attempting to handle well known request')
  const accts = await listAccounts(undefined, undefined, transport)
  const firstAcct = accts.accounts[0]
  if (!firstAcct) throw new Error('Nope')
  const acctId = firstAcct.id
  const device = firstAcct.devices[0]
  if (!device) throw new Error('Nope')
  const peerInfo = await getPeerInfo(device, transport)
  const wellKnown = {
    account_id: acctId,
    addresses: peerInfo.addrs,
  }

  // const test = {
  //   "addresses":[
  //     "/ip4/52.22.139.174/tcp/4002/p2p/12D3KooWGvsbBfcbnkecNoRBM7eUTiuriDqUyzu87pobZXSdUUsJ/p2p-circuit/p2p/12D3KooWMdZR3ouu86fwx45x8iGYt71pNnDBDA1TUaPjxddbTfWV",
  //     "/ip4/23.20.24.146/tcp/4002/p2p/12D3KooWNmjM4sMbSkDEA6ShvjTgkrJHjMya46fhZ9PjKZ4KVZYq/p2p-circuit/p2p/12D3KooWMdZR3ouu86fwx45x8iGYt71pNnDBDA1TUaPjxddbTfWV",
  //     "/ip4/172.18.0.2/tcp/56001/p2p/12D3KooWMdZR3ouu86fwx45x8iGYt71pNnDBDA1TUaPjxddbTfWV",
  //     "/ip4/127.0.0.1/tcp/56001/p2p/12D3KooWMdZR3ouu86fwx45x8iGYt71pNnDBDA1TUaPjxddbTfWV"],
  //   "account_id":"bahezrj4iaqacicabciqbwucjqaesq4f7uqujqt3wsws6oztx6xl5h6hpqk2hjjlw4iqysma"
  // }

  res.headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify(wellKnown))
}
