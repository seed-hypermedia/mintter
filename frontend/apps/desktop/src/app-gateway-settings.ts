import z from 'zod'
import {appStore} from './app-store'
import {t} from './app-trpc'

const GATEWAY_URL_KEY = 'GatewayUrl'

const DEFAULT_GATEWAY_URL =
  process.env.MINTTER_P2P_TESTNET_NAME === 'dev'
    ? 'https://mintter.xyz'
    : 'https://hyper.media'

let gatewayUrl =
  (appStore.get(GATEWAY_URL_KEY) as string) || DEFAULT_GATEWAY_URL

async function writeGatewayUrl(url: string) {
  gatewayUrl = url
  appStore.set(GATEWAY_URL_KEY, url)
  return undefined
}

export const gatewaySettingsApi = t.router({
  getGatewayUrl: t.procedure.query(async () => {
    return gatewayUrl
  }),
  setGatewayUrl: t.procedure.input(z.string()).mutation(async ({input}) => {
    await writeGatewayUrl(input)
    return undefined
  }),
})
