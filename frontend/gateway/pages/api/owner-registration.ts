import {daemonClient} from '../../client'
import {NextRequest, NextResponse} from 'next/server'

export default async function handler(req: NextRequest, res: NextResponse) {
  if (req.method === 'POST') {
    const requestHeaders = new Headers(req.headers)
    const host = requestHeaders.get('host');
    if(!host || (!host.includes("127.0.0.1") && !host.includes("localhost"))){
      return new Response(JSON.stringify({ErrMsg: 'Local calls only',}),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      }
    )
    }
    try {
      const words = await req.json();
      const accID = await daemonClient.register({mnemonic: words})
      return new Response(JSON.stringify(accID), {
        headers: {
          'Content-Type': 'application/json',
        },
      })
    } catch (e) {
      return new Response(JSON.stringify(e),
      {
        status: 400,
        headers: {
          'content-type': 'application/json',
        },
      }
    )
    }
  }else{
    return new Response(JSON.stringify({ErrMsg: 'Only POST allowed',}),
      {
        status: 405,
        headers: {
          'content-type': 'application/json',
        },
      }
    )
  }

}
