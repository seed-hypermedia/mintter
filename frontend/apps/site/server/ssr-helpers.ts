import {createServerSideHelpers} from '@trpc/react-query/server'
import type {EveryPageProps} from 'pages/_app'
import {appRouter} from './routers/_app'
import {prefetchSiteInfo} from './prefetchSiteInfo'
import {setAllowAnyHostGetCORS} from './cors'

export function serverHelpers(context: {}) {
  return createServerSideHelpers({
    router: appRouter,
    ctx: context,
  })
}

export type ServerHelpers = ReturnType<typeof serverHelpers>

export async function getPageProps<AdditionalProps = {}>(
  helpers: ServerHelpers,
  context: any,
  props: AdditionalProps,
): Promise<AdditionalProps & EveryPageProps> {
  // setAllowAnyHostGetCORS(context.res)

  const siteInfo = await prefetchSiteInfo(helpers)
  if (siteInfo?.p2pAddresses) {
    // context.res.setHeader(
    //   'x-mintter-site-p2p-addresses',
    //   siteInfo.p2pAddresses.join(','),
    // )
  }
  return {
    ...props,
    trpcState: helpers.dehydrate(),
  }
}
