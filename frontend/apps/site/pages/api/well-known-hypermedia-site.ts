import {NextApiRequest, NextApiResponse} from 'next'

export default async function wellKnownHM(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const daemonWellKnownUrl = `${process.env.NEXT_PUBLIC_GRPC_HOST}.well-known/hypermedia-site`
  const daemonResp = await fetch(daemonWellKnownUrl)
  const daemonWellKnown = await daemonResp.json()
  res.send(daemonWellKnown)
}
