// test page for groupsClient.getSiteInfo({ hostname: process.env.HM_BASE_URL }) so we can see if this works in production
import {groupsClient} from 'client'
import {NextApiRequest, NextApiResponse} from 'next'

const gatewayHostWithProtocol = process.env.HM_BASE_URL
const gatewayHost = new URL(gatewayHostWithProtocol || '').hostname

console.log('ℹ️ site info! ', {
  gatewayHost,
  gatewayHostWithProtocol,
  port: process.env.PORT,
  grpcHost: process.env.NEXT_PUBLIC_GRPC_HOST,
})

export default async function siteTestHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  const info = await groupsClient.getSiteInfo({
    hostname: gatewayHostWithProtocol,
  })

  res
    .status(200)
    .setHeader('Content-Type', 'application/json')
    .send(JSON.stringify(info.toJson(), null, 2))
}
