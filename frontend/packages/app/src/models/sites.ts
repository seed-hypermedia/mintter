import {
  Block,
  Document,
  getIdsfromUrl,
  GRPCClient,
  Member,
  Member_Role,
  ReferencedDocument,
  SiteConfig,
  SiteInfo,
} from '@mintter/shared'
import {useMutation, UseMutationOptions, useQuery} from '@tanstack/react-query'
import {queryKeys} from './query-keys'
import {useNavigate} from '@mintter/app/src/utils/navigation'
import {toast} from '@mintter/app/src/toast'
import {useAppContext, useQueryInvalidator} from '@mintter/app/src/app-context'
import {useGRPCClient} from '../app-context'

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

async function getDocWebPublications(
  grpcClient: GRPCClient,
  documentId: string,
) {
  const result = await grpcClient.webPublishing.listWebPublicationRecords({
    documentId,
  })
  return result.publications
}

export function useDocWebPublications(docId?: string) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_DOC_SITE_PUBLICATIONS, docId],
    queryFn: async () => {
      if (!docId) return []
      return await getDocWebPublications(grpcClient, docId)
    },
  })
}

export function useSiteList() {
  const grpcClient = useGRPCClient()
  return useQuery<SiteConfig[]>({
    queryKey: [queryKeys.GET_SITES],
    queryFn: async () => {
      const result = await grpcClient.webPublishing.listSites({})
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
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation(
    async (input: {hostname: string; inviteToken?: string}) => {
      await grpcClient.webPublishing.addSite(input)
      return null
    },
    {
      ...options,
      onSuccess: (_result, _hostname, ctx) => {
        invalidate([queryKeys.GET_SITES])
        options?.onSuccess?.(_result, _hostname, ctx)
      },
    },
  )
}

export function useSiteInfo(hostname: string) {
  const grpcClient = useGRPCClient()
  return useQuery<SiteInfo>({
    queryKey: [queryKeys.GET_SITE_INFO, hostname],
    queryFn: async () => {
      return await grpcClient.getRemoteWebClient(hostname).getSiteInfo({})
    },
  })
}

export function useWriteSiteInfo(
  hostname: string,
  opts?: UseMutationOptions<unknown, unknown, Partial<SiteInfo>>,
) {
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  return useMutation(
    async (info: Partial<SiteInfo>) => {
      await grpcClient.getRemoteWebClient(hostname).updateSiteInfo(info)
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        invalidate([queryKeys.GET_SITE_INFO, hostname])
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useSiteMembers(hostname: string) {
  const grpcClient = useGRPCClient()
  return useQuery<Member[]>({
    queryKey: [queryKeys.GET_SITE_MEMBERS, hostname],
    queryFn: async () => {
      const site = await grpcClient.getRemoteWebClient(hostname)
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
  const grpcClient = useGRPCClient()
  return useMutation(
    async () => {
      const token = await grpcClient
        .getRemoteWebClient(hostname)
        .createInviteToken({
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
  const grpcClient = useGRPCClient()
  const invalidate = useQueryInvalidator()
  return useMutation(
    async (accountId: string) => {
      await grpcClient.getRemoteWebClient(hostname).deleteMember({
        accountId,
      })
      return
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        invalidate([queryKeys.GET_SITE_MEMBERS, hostname])
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useRemoveSite(hostname: string, opts: UseMutationOptions) {
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
  return useMutation(
    async () => {
      await grpcClient.webPublishing.removeSite({hostname})
    },
    {
      ...opts,
      onSuccess: (response, input, ctx) => {
        invalidate([queryKeys.GET_SITES])
        opts?.onSuccess?.(response, input, ctx)
      },
    },
  )
}

export function useSitePublications(hostname: string | undefined) {
  const grpcClient = useGRPCClient()
  return useQuery({
    queryKey: [queryKeys.GET_SITE_PUBLICATIONS, hostname],
    queryFn: async () => {
      if (!hostname) return {publications: []}
      const site = grpcClient.getRemoteWebClient(hostname)
      return await site.listWebPublications({})
    },
  })
}

async function performWebPublish(
  grpcClient: GRPCClient,
  document: Document,
  hostname: string,
  path: string,
  version: string,
) {
  // 3. get referenced dependencies of the document
  const referencedDocs = extractReferencedDocs(document)

  // 4. publish the document to the site
  const site = grpcClient.getRemoteWebClient(hostname)
  await site.publishDocument({
    documentId: document.id,
    path: path,
    referencedDocuments: referencedDocs,
    version,
  })
}

export function useSitePublish(draftId: string | undefined) {
  const {invalidate, client} = useAppContext().queryClient
  const navigate = useNavigate('replace')
  const grpcClient = useGRPCClient()
  return useMutation(
    async ({path}: {path: string}) => {
      // welcome to the "initial" Web Publish flow, when the path is set

      const draft = await grpcClient.drafts.getDraft({documentId: draftId})
      if (!draft) throw new Error('no draft found')
      const site = grpcClient.getRemoteWebClient(draft.webUrl)

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
      const publication = await grpcClient.drafts.publishDraft({
        documentId: docId,
      })
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
        grpcClient,
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
        invalidate([queryKeys.PUBLICATION_CHANGES, docId])
        invalidate([queryKeys.GET_PUBLICATION, docId])
        invalidate([queryKeys.GET_PUBLICATION_LIST])
        invalidate([queryKeys.GET_DRAFT_LIST])
        client.setQueryData([queryKeys.EDITOR_DRAFT, docId], () => null)
        navigate({
          key: 'publication',
          documentId: docId,
          versionId: publication.version,
        })
        if (hostname) invalidate([queryKeys.GET_SITE_PUBLICATIONS, hostname])
        invalidate([queryKeys.GET_DOC_SITE_PUBLICATIONS, docId])
      },
    },
  )
}

export function useSiteUnpublish() {
  const invalidate = useQueryInvalidator()
  const grpcClient = useGRPCClient()
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
      const site = grpcClient.getRemoteWebClient(hostname)
      await site.unpublishDocument({
        documentId,
        version,
      })
    },
    {
      onSuccess: (a, input) => {
        invalidate([queryKeys.GET_SITE_PUBLICATIONS, input.hostname])
        invalidate([queryKeys.GET_DOC_SITE_PUBLICATIONS])
      },
    },
  )
}
