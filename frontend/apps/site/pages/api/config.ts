import {NextApiRequest, NextApiResponse} from 'next'

export default async function wellKnownHM(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.send({
    enableGateway: process.env.NEXT_PUBLIC_ENABLE_GATEWAY,
    lnHost: process.env.NEXT_PUBLIC_LN_HOST,
  })
}
