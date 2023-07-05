import {appInvalidateQueries, appQueryClient} from '@app/query-client'
import {
  Block,
  Document,
  getIdsfromUrl,
  Member,
  Member_Role,
  ReferencedDocument,
  SiteConfig,
  SiteInfo,
} from '@mintter/shared'
import {useMutation, UseMutationOptions, useQuery} from '@tanstack/react-query'
import {
  draftsClient,
  getWebSiteClient,
  webPublishingClient,
} from '@app/api-clients'
import {queryKeys} from './query-keys'
import {useNavigate} from '@app/utils/navigation'
import {toast} from '@app/toast'

function blockExtractReferencedDocs(
  block: Block,
): Partial<ReferencedDocument>[] {
  const docIds: Array<any> = []
  block.annotations.forEach((annotation) => {
    if (annotation.type === 'embed' || annotation.type === 'link') {
      let ids
      try {
        ids = getIdsfromUrl(annotation.attributes.url)
      } catch (e) {
        // not the best fix for now, but regular URLS are coming through here and we can just skip over them
      }
      if (ids?.[0]) {
        docIds.push({documentId: ids[0], version: ids[1]})
      }
    }
  })
  return docIds
}

export function extractReferencedDocs(doc: Document) {
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

export function useDocWebPublications(docId?: string) {
  return useQuery({
    queryKey: [queryKeys.GET_DOC_SITE_PUBLICATIONS, docId],
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
    queryKey: [queryKeys.GET_SITE_PUBLICATIONS, hostname],
    queryFn: async () => {
      if (!hostname) return {publications: []}
      const site = getWebSiteClient(hostname)
      return await site.listWebPublications({})
    },
  })
}

async function performWebPublish(
  document: Document,
  hostname: string,
  path: string,
  version: string,
) {
  // 3. get referenced dependencies of the document
  const referencedDocs = extractReferencedDocs(document)

  // 4. publish the document to the site
  const site = getWebSiteClient(hostname)
  await site.publishDocument({
    documentId: document.id,
    path: path,
    referencedDocuments: referencedDocs,
    version,
  })
}

export function useSitePublish(draftId: string | undefined) {
  const navigate = useNavigate('replace')
  return useMutation(
    async ({path}: {path: string}) => {
      // welcome to the "initial" Web Publish flow, when the path is set

      const draft = await draftsClient.getDraft({documentId: draftId})
      if (!draft) throw new Error('no draft found')
      const site = getWebSiteClient(draft.webUrl)

      const pubs = await site.listWebPublications({}).catch((e) => {
        if (e.message.includes('failed to dial to site')) {
          throw new Error('Cannot connect to ' + draft.webUrl)
        }
      })
      if (!pubs) throw new Error('Cannot connect to ' + draft.webUrl)

      if (pubs.publications.find((pub) => pub.path === path)) {
        throw new Error(`Path ${path} already exists on ${draft.webUrl}`)
      }

      const docId = draftId
      if (!docId) throw new Error('No draftId provided to useSitePublish')
      const publication = await draftsClient.publishDraft({documentId: docId})
      const document = publication.document
      if (!document) throw new Error('No document in new publication?!')

      // 1. get the account ID of the publisher
      const webUrl = publication.document?.webUrl

      if (!webUrl) {
        // Bailing because no webUrl on this draft. this should not happen because useSitePublish should only be called on drafts that have a webUrl set
        return {
          publication,
          docId,
          hostname: undefined,
        }
      }

      await performWebPublish(
        document,
        webUrl,
        path,
        publication.version,
      ).catch((e) => {
        console.error('Caught webPub failure', e)
        toast.error('Failed to publish on web.')
      })

      return {
        publication,
        docId,
        hostname: webUrl,
      }
    },
    {
      onSuccess: ({publication, docId, hostname}, input) => {
        appInvalidateQueries([queryKeys.PUBLICATION_CHANGES, docId])
        appInvalidateQueries([queryKeys.GET_PUBLICATION, docId])
        appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
        appInvalidateQueries([queryKeys.GET_DRAFT_LIST])
        appQueryClient.setQueryData([queryKeys.EDITOR_DRAFT, docId], () => null)
        navigate({
          key: 'publication',
          documentId: docId,
          versionId: publication.version,
        })
        if (hostname)
          appInvalidateQueries([queryKeys.GET_SITE_PUBLICATIONS, hostname])
        appInvalidateQueries([queryKeys.GET_DOC_SITE_PUBLICATIONS, docId])
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
      await site.unpublishDocument({
        documentId,
        version,
      })
    },
    {
      onSuccess: (a, input) => {
        appInvalidateQueries([queryKeys.GET_SITE_PUBLICATIONS, input.hostname])
        appInvalidateQueries([queryKeys.GET_DOC_SITE_PUBLICATIONS])
      },
    },
  )
}
