import {appQueryClient} from '@app/query-client'
import {
  client,
  AddSiteRequest,
  DeleteSiteRequest,
  ListSitesRequest,
  SiteConfig,
  SitesClientImpl,
  SiteClientImpl,
  GetSiteInfoRequest,
  PublishRequest,
  SiteInfo,
  UnpublishRequest,
  UpdateSiteInfoRequest,
  ListWebPublicationsRequest,
} from '@mintter/shared'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {queryKeys} from './index'

const sitesClient = new SitesClientImpl(client)

async function sendSiteRequest<Result>(
  hostname: string,
  perform: (client: SiteClientImpl) => Promise<Result>,
) {
  const siteClient = new SiteClientImpl(client)
  // todo: set hostname header
  return await perform(siteClient)
}

export function useDocPublications(docId: string) {
  return useQuery({
    queryKey: [queryKeys.GET_DOC_PUBLICATIONS],
    queryFn: async () => {
      return []
    },
  })
}

export function useSiteList() {
  return useQuery<SiteConfig[]>({
    queryKey: [queryKeys.GET_SITES],
    queryFn: async () => {
      // EV TESTING:
      // return {
      //   sites: [
      //     {
      //       hostname: 'temp-test.org',
      //       role: Member_Role.OWNER,
      //     },
      //   ],
      //   nextPageToken: '',
      // }
      const result = await sitesClient.listSites(
        ListSitesRequest.fromPartial({}),
      )
      return result.sites
    },
  })
}

export function useAddSite() {
  const queryClient = useQueryClient()

  return useMutation(
    async (hostname: string, token?: string) => {
      await sitesClient.addSite(
        AddSiteRequest.fromPartial({
          hostname,
          inviteToken: token,
        }),
      )
      return null
    },
    {
      onSuccess: (_result, _hostname) => {
        queryClient.invalidateQueries([queryKeys.GET_SITES])
        // queryClient.setQueryData(
        //   [queryKeys.GET_SITES],
        //   (oldSites: Site[] | undefined) => {
        //     const site = {id: hostname}
        //     if (oldSites) return [...oldSites, site]
        //     return [site]
        //   },
        // )
      },
    },
  )
}

export function useSiteInfo(hostname: string) {
  return useQuery<SiteInfo>({
    queryKey: [queryKeys.GET_SITE_INFO, hostname],
    queryFn: async () => {
      return await sendSiteRequest(hostname, (client) =>
        client.getSiteInfo(GetSiteInfoRequest.fromPartial({})),
      )
    },
  })
}

export function useWriteSiteInfo(
  hostname: string,
  opts?: UseMutationOptions<unknown, unknown, Partial<SiteInfo>>,
) {
  return useMutation(
    async (info: Partial<SiteInfo>) => {
      return await sendSiteRequest(hostname, (client) =>
        client.updateSiteInfo(
          UpdateSiteInfoRequest.fromPartial({
            description: info.description,
            title: info.title,
          }),
        ),
      )
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        appQueryClient.invalidateQueries([queryKeys.GET_SITE_INFO, hostname])
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useRemoveSite(siteId: string, opts: UseMutationOptions) {
  const queryClient = useQueryClient()

  return useMutation(
    async () => {
      await sitesClient.deleteSite(
        DeleteSiteRequest.fromPartial({hostname: siteId}),
      )
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        queryClient.invalidateQueries([queryKeys.GET_SITES])

        // queryClient.setQueryData(
        //   [queryKeys.GET_SITES],
        //   (oldSites: any[] | undefined) => {
        //     if (oldSites) return oldSites.filter((site) => site.id !== siteId)
        //     return undefined
        //   },
        // )
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useSitePublications(hostname: string | undefined) {
  return useQuery({
    queryKey: [queryKeys.GET_WEB_PUBLICATIONS, hostname],
    queryFn: async () => {
      if (!hostname) return {publications: []}

      // EV TESTING:
      // return {
      //   publications: [
      //     {
      //       docId: 'lol',
      //       authorName: 'Horacio',
      //       publicationId: '123',
      //       updateTime: new Date(),
      //       docTitle: 'The Home Document',
      //       path: '',
      //     },
      //     {
      //       docId: '1',
      //       authorName: 'Eric',
      //       publicationId: '1233',
      //       updateTime: new Date(),
      //       docTitle: 'The Title at Thepath',
      //       path: 'thepath',
      //     },
      //     {
      //       docId: '2',
      //       authorName: 'Eric',
      //       publicationId: '1234',
      //       updateTime: new Date(),
      //       docTitle: 'The Unlisted Title',
      //     },
      //   ] as ListedWebPublication[],
      // }

      return await sendSiteRequest(hostname, (client) =>
        client.listWebPublications(ListWebPublicationsRequest.fromPartial({})),
      )
    },
  })
}

export function useSitePublish() {
  const queryClient = useQueryClient()
  return useMutation(
    async ({
      hostname,
      docId,
      path,
    }: {
      hostname: string
      docId: string
      path: string
    }) => {
      await sendSiteRequest(hostname, (client) =>
        client.publish(
          PublishRequest.fromPartial({
            docId,
            path,
            version: 'soon',
            referencedDocIds: [],
          }),
        ),
      )
    },
    {
      onSuccess: (a, input) => {
        queryClient.invalidateQueries([
          queryKeys.GET_WEB_PUBLICATIONS,
          input.hostname,
        ])
      },
    },
  )
}

export function useSiteUnpublish() {
  const queryClient = useQueryClient()
  return useMutation(
    async ({
      hostname,
      publicationId,
    }: {
      hostname: string
      publicationId: string
    }) => {
      await sendSiteRequest(hostname, (client) =>
        client.unpublish(
          UnpublishRequest.fromPartial({
            publicationId,
          }),
        ),
      )
    },
    {
      onSuccess: (a, input) => {
        queryClient.invalidateQueries([
          queryKeys.GET_WEB_PUBLICATIONS,
          input.hostname,
        ])
      },
    },
  )
}
