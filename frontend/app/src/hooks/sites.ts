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
  Document,
  GetPublicationRequest,
  PublicationsClientImpl,
  Member_Role,
  Block,
  Publication,
  GetDocWebPublicationsRequest,
} from '@mintter/shared'
import {
  useMutation,
  UseMutationOptions,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {queryKeys} from './index'

const sitesClient = new SitesClientImpl(client)
const publicationsClient = new PublicationsClientImpl(client)

function blockExtractReferencedDocIds(block: Block) {
  const docIds: string[] = []
  block.annotations.forEach((annotation) => {
    if (annotation.type === 'embed') {
      docIds.push(annotation.attributes.url)
    }
    if (annotation.type === 'link') {
      docIds.push(annotation.attributes.url)
    }
  })
  return docIds
}

function extractReferencedDocIds(doc: Document) {
  return doc.children
    .map((child) =>
      child.block ? blockExtractReferencedDocIds(child.block) : [],
    )
    .flat()
}

async function getDocWebPublications(docId: string) {
  const result = await sitesClient.getDocWebPublications(
    GetDocWebPublicationsRequest.fromPartial({
      docId,
    }),
  )
  return result.publications
}

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
    queryKey: [queryKeys.GET_DOC_PUBLICATIONS, docId],
    queryFn: async () => {
      return await getDocWebPublications(docId)
    },
  })
}

export function useSiteList() {
  return useQuery<SiteConfig[]>({
    queryKey: ['hgyg'],
    queryFn: async () => {
      // EV TESTING:
      // return [
      //   {
      //     hostname: 'temp-test.org',
      //     role: Member_Role.OWNER,
      //   },
      // ]
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
      const {version, document} = await publicationsClient.getPublication(
        GetPublicationRequest.fromPartial({documentId: docId}),
      )
      if (!document)
        throw new Error('Cannot publish document that is not available locally')
      const referencedDocIds = extractReferencedDocIds(document)
      await sendSiteRequest(hostname, (client) =>
        client.publish(
          PublishRequest.fromPartial({
            docId: document.id,
            path,
            version: version,
            referencedDocIds,
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

export function useDocRepublish() {
  return useMutation(
    async ({document, version}: Publication) => {
      if (!document)
        throw new Error('Cannot publish document that is not available locally')
      const referencedDocIds = extractReferencedDocIds(document)
      const webPubs = await getDocWebPublications(document.id)
      await Promise.all(
        webPubs.map(async (webPub) => {
          await sendSiteRequest(webPub.hostname, (client) =>
            client.publish(
              PublishRequest.fromPartial({
                publicationId: webPub.publicationId,
                docId: document.id,
                path: webPub.path,
                version: version,
                referencedDocIds,
              }),
            ),
          )
        }),
      )
    },
    {
      onSuccess: (a, input) => {
        appQueryClient.invalidateQueries([queryKeys.GET_WEB_PUBLICATIONS])
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
