import {MINTTER_LINK_PREFIX} from '@app/constants'
import {appInvalidateQueries} from '@app/query-client'
import {
  Block,
  Document,
  Member,
  Member_Role,
  Publication,
  ReferencedDocument,
  SiteConfig,
  SiteInfo,
  WebPublicationRecord,
} from '@mintter/shared'
import {useMutation, UseMutationOptions, useQuery} from '@tanstack/react-query'
import {
  getWebSiteClient,
  publicationsClient,
  webPublishingClient,
} from '@app/api-clients'
import {queryKeys} from './index'

const mttUrlRegEx =
  '^' +
  MINTTER_LINK_PREFIX.replace('/', '/') +
  '([a-z0-9]+)/([a-z0-9]+)/([a-zA-Z0-9]+)$'

function blockExtractReferencedDocs(
  block: Block,
): Partial<ReferencedDocument>[] {
  const docIds: Array<any> = []
  block.annotations.forEach((annotation) => {
    if (annotation.type === 'embed' || annotation.type === 'link') {
      const match = annotation.attributes.url.match(mttUrlRegEx) ?? ['', '', '']
      docIds.push({documentId: match[1], version: match[2]})
    }
  })
  return docIds
}

function extractReferencedDocs(doc: Document) {
  return doc.children
    .map((child) =>
      child.block ? blockExtractReferencedDocs(child.block) : [],
    )
    .flat()
}

async function getDocWebPublications(documentId: string) {
  const result = await webPublishingClient.listWebPublicationRecords({
    documentId,
  })
  return result.publications
}

export function useDocPublications(docId?: string) {
  return useQuery({
    queryKey: [queryKeys.GET_DOC_PUBLICATIONS, docId],
    queryFn: async () => {
      if (!docId) return []
      return await getDocWebPublications(docId)
    },
  })
}

export function useSiteList() {
  return useQuery<SiteConfig[]>({
    queryKey: [queryKeys.GET_SITES],
    queryFn: async () => {
      const result = await webPublishingClient.listSites({})
      return result.sites
    },
  })
}

export function useAddSite(
  options?: UseMutationOptions<
    null,
    void,
    {hostname: string; inviteToken?: string},
    unknown
  >,
) {
  return useMutation(
    async (input: {hostname: string; inviteToken?: string}) => {
      await webPublishingClient.addSite(input)
      return null
    },
    {
      ...options,
      onSuccess: (_result, _hostname, ctx) => {
        appInvalidateQueries([queryKeys.GET_SITES])
        options?.onSuccess?.(_result, _hostname, ctx)
      },
    },
  )
}

export function useSiteInfo(hostname: string) {
  return useQuery<SiteInfo>({
    queryKey: [queryKeys.GET_SITE_INFO, hostname],
    queryFn: async () => {
      return await getWebSiteClient(hostname).getSiteInfo({})
    },
  })
}

export function useWriteSiteInfo(
  hostname: string,
  opts?: UseMutationOptions<unknown, unknown, Partial<SiteInfo>>,
) {
  return useMutation(
    async (info: Partial<SiteInfo>) => {
      await getWebSiteClient(hostname).updateSiteInfo(info)
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        appInvalidateQueries([queryKeys.GET_SITE_INFO, hostname])
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useSiteMembers(hostname: string) {
  return useQuery<Member[]>({
    queryKey: [queryKeys.GET_SITE_MEMBERS, hostname],
    queryFn: async () => {
      const site = await getWebSiteClient(hostname)
      const result = await site.listMembers({}).catch((e) => {
        console.error(e)
        return {members: []}
      })
      return result.members
    },
  })
}

export function useInviteMember(
  hostname: string,
  opts?: UseMutationOptions<string, unknown, void>,
) {
  return useMutation(
    async () => {
      const token = await getWebSiteClient(hostname).createInviteToken({
        role: Member_Role.EDITOR,
      })
      return token.token
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        // invalidate, refetch? members list probably wont change yet
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useRemoveMember(
  hostname: string,
  opts?: UseMutationOptions<void, unknown, string>,
) {
  return useMutation(
    async (accountId: string) => {
      await getWebSiteClient(hostname).deleteMember({
        accountId,
      })
      return
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        appInvalidateQueries([queryKeys.GET_SITE_MEMBERS, hostname])
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useRemoveSite(hostname: string, opts: UseMutationOptions) {
  return useMutation(
    async () => {
      await webPublishingClient.removeSite({hostname})
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        appInvalidateQueries([queryKeys.GET_SITES])
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
      const site = getWebSiteClient(hostname)
      return await site.listWebPublications({})
    },
  })
}

export function useSitePublish() {
  return useMutation(
    async ({
      hostname,
      documentId,
      path,
    }: {
      hostname: string
      documentId: string
      path: string
    }) => {
      const {version, document} = await publicationsClient.getPublication({
        documentId,
      })
      if (!document)
        throw new Error('Cannot publish document that is not available locally')
      const referencedDocs = extractReferencedDocs(document)
      const site = getWebSiteClient(hostname)
      site.publishDocument({
        documentId: documentId,
        path: path,
        referencedDocuments: referencedDocs,
        version: version,
      })
    },
    {
      onSuccess: (a, input) => {
        appInvalidateQueries([queryKeys.GET_WEB_PUBLICATIONS, input.hostname])
        appInvalidateQueries([queryKeys.GET_DOC_PUBLICATIONS, input.documentId])
      },
    },
  )
}

export function useDocRepublish(
  opts: UseMutationOptions<
    WebPublicationRecord[],
    unknown,
    Publication,
    unknown
  >,
) {
  return useMutation(
    async ({document, version}: Publication) => {
      if (!document)
        throw new Error('Cannot publish document that is not available locally')
      const referencedDocuments = extractReferencedDocs(document)
      const webPubs = await getDocWebPublications(document.id)
      await Promise.all(
        webPubs.map(async (webPub) => {
          const site = getWebSiteClient(webPub.hostname)
          await site.publishDocument({
            documentId: document.id,
            path: webPub.path,
            version: version,
            referencedDocuments,
          })
        }),
      )
      return webPubs
    },
    {
      ...opts,
      onSuccess: (webPubs, input, ctx) => {
        appInvalidateQueries([
          queryKeys.GET_DOC_PUBLICATIONS,
          input.document?.id,
        ])
        webPubs.forEach((webPub) =>
          appInvalidateQueries([
            queryKeys.GET_WEB_PUBLICATIONS,
            webPub.hostname,
          ]),
        )
        opts.onSuccess?.(webPubs, input, ctx)
      },
    },
  )
}

export function useSiteUnpublish() {
  return useMutation(
    async ({
      hostname,
      documentId,
      version,
    }: {
      hostname: string
      documentId: string
      version: string
    }) => {
      const site = getWebSiteClient(hostname)
      site.unpublishDocument({
        documentId,
        version,
      })
    },
    {
      onSuccess: (a, input) => {
        appInvalidateQueries([queryKeys.GET_WEB_PUBLICATIONS, input.hostname])
      },
    },
  )
}
