import {NextRequest, NextResponse} from 'next/server'
import {daemonClient} from '../../src/client'

export default async function handler(req: NextRequest, res: NextResponse) {
  if (req.method === 'POST') {
    const requestHeaders = new Headers(req.headers)
    const host = requestHeaders.get('host')
    if (!host || (!host.includes('127.0.0.1') && !host.includes('localhost'))) {
      return new Response(null, {status: 404})
    }
    try {
      const words = await req.json()
      const accID = await daemonClient.register({mnemonic: words})
      return new Response(accID['accountId'])
    } catch (e) {
      return new Response(JSON.stringify(e), {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      })
    }
  } else {
    return new Response(null, {status: 404})
  }
}
