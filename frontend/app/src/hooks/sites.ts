import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {
  getWebPublishingClient,
  getWebSiteClient,
  SiteConfig,
  SiteInfo,
  Document,
  Block,
  Publication,
  getPublication,
  ReferencedDocument,
  Member,
  Member_Role,
} from '@mintter/shared'
import {useMutation, UseMutationOptions, useQuery} from '@tanstack/react-query'
import {queryKeys} from './index'

const webPub = getWebPublishingClient()

function blockExtractReferencedDocs(
  block: Block,
): Partial<ReferencedDocument>[] {
  const docIds: string[] = []
  block.annotations.forEach((annotation) => {
    if (annotation.type === 'embed') {
      docIds.push(annotation.attributes.url)
    }
    if (annotation.type === 'link') {
      docIds.push(annotation.attributes.url)
    }
  })
  return docIds.map((docId) => ({
    documentId: docId,
    version: '',
  }))
}

function extractReferencedDocs(doc: Document) {
  return doc.children
    .map((child) =>
      child.block ? blockExtractReferencedDocs(child.block) : [],
    )
    .flat()
}

async function getDocWebPublications(documentId: string) {
  const result = await webPub.listWebPublicationRecords({documentId})
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
      const result = await webPub.listSites({})
      return result.sites
    },
  })
}

export function useAddSite(
  options?: UseMutationOptions<null, void, string, unknown>,
) {
  return useMutation(
    async (hostname: string, inviteToken?: string) => {
      await webPub.addSite({hostname, inviteToken})
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
        throw e
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

export function useRemoveSite(hostname: string, opts: UseMutationOptions) {
  return useMutation(
    async () => {
      await webPub.removeSite({hostname})
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
      const {version, document} = await getPublication(documentId)
      if (!document)
        throw new Error('Cannot publish document that is not available locally')
      const referencedDocs = extractReferencedDocs(document)
      const site = getWebSiteClient(hostname)
      site.publishDocument({
        documentId,
        path,
        referencedDocuments: referencedDocs,
        version,
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

export function useDocRepublish() {
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
    },
    {
      onSuccess: (a, input) => {
        appInvalidateQueries([queryKeys.GET_WEB_PUBLICATIONS])
      },
    },
  )
}

export function useSiteUnpublish() {
  return useMutation(
    async ({hostname, documentId}: {hostname: string; documentId: string}) => {
      const site = getWebSiteClient(hostname)
      site.unpublishDocument({
        documentId,
      })
    },
    {
      onSuccess: (a, input) => {
        appInvalidateQueries([queryKeys.GET_WEB_PUBLICATIONS, input.hostname])
      },
    },
  )
}
