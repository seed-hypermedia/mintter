import {createServerSideHelpers} from '@trpc/react-query/server'
import type {EveryPageProps} from 'pages/_app'
import {appRouter} from './routers/_app'

export function serverHelpers(context: {}) {
  return createServerSideHelpers({
    router: appRouter,
    ctx: context,
  })
}

type ServerHelpers = ReturnType<typeof serverHelpers>

export async function getPageProps<AdditionalProps = {}>(
  helpers: ServerHelpers,
  props: AdditionalProps,
): Promise<AdditionalProps & EveryPageProps> {
  // await helpers.siteInfo.get.prefetch()
  return {
    ...props,
    trpcState: helpers.dehydrate(),
  }
}
