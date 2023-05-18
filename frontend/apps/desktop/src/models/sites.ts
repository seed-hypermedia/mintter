import {appInvalidateQueries} from '@app/query-client'
import {
  Block,
  Document,
  DocumentChange,
  getIdsfromUrl,
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
  draftsClient,
  getWebSiteClient,
  publicationsClient,
  webPublishingClient,
} from '@app/api-clients'
import {queryKeys} from './query-keys'
import {useNavigate} from '@app/utils/navigation'

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

export function useSitePublish() {
  const navigate = useNavigate('replace')
  return useMutation(
    async ({
      hostname,
      documentId,
      version,
      path,
    }: {
      hostname: string
      documentId: string
      version: string
      path: string
    }) => {
      // welcome to New Publish
      // right now the doc is currently published to the p2p and we want to put it on a site

      // 1. get the account ID of the publisher
      // 2. ensure document has correct publisher set
      //   a. if not, create a draft, set the publisher, save new version
      // 3. get referenced dependencies of the document
      // 4. publish the document to the site

      const {document, ...localPub} = await publicationsClient.getPublication({
        documentId,
        version,
      })
      if (!document)
        throw new Error('Cannot publish document that is not available locally')

      // 1. get the account ID of the publisher

      const wellKnownResponse = await fetch(
        `${hostname}/api/mintter-well-known`,
      )
      if (!wellKnownResponse.ok)
        throw new Error(
          `Failed to query well-known of site when determining publisher id. Status: ${wellKnownResponse.status}`,
        )
      const siteWellKnown = await wellKnownResponse.json()
      const publisherId: string | undefined =
        siteWellKnown?.account_id ?? String(siteWellKnown?.account_id)

      if (!publisherId) {
        throw new Error(
          'Publisher id could not be found from site well-known response',
        )
      }

      if (document.webUrl === hostname) {
        // continue if the publisher is already correct for this version
        await performWebPublish(document, hostname, path, version)
        return {version, fromDocument: document, fromVersion: version}
      }
      // we need to create a new version with the correct publisher id
      if (version !== localPub.version) {
        throw new Error(
          'You can only publish the latest version of a document, because we need to write the publisher field, and drafts cannot be created on old versions yet.',
        )
      }
      const draft = await draftsClient.createDraft({
        existingDocumentId: documentId,
      })
      await draftsClient.updateDraftV2({
        documentId: draft.id,
        changes: [
          new DocumentChange({
            op: {case: 'setWebUrl', value: hostname},
          }),
        ],
      })
      const newPub = await draftsClient.publishDraft({
        documentId: draft.id,
      })
      await performWebPublish(document, hostname, path, newPub.version)
      return {
        version: newPub.version,
        fromDocument: document,
        fromVersion: version,
      }
    },
    {
      onSuccess: ({version, fromDocument, fromVersion}, input) => {
        if (version !== fromVersion) {
          appInvalidateQueries([
            queryKeys.PUBLICATION_CHANGES,
            input.documentId,
          ])
          appInvalidateQueries([queryKeys.GET_PUBLICATION, input.documentId])
          appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
          navigate({
            key: 'publication',
            documentId: fromDocument.id,
            versionId: version,
          })
        }
        appInvalidateQueries([queryKeys.GET_SITE_PUBLICATIONS, input.hostname])
        appInvalidateQueries([
          queryKeys.GET_DOC_SITE_PUBLICATIONS,
          input.documentId,
        ])
      },
    },
  )
}

export function useSitePublishDraft(draftId: string | undefined) {
  const navigate = useNavigate('replace')
  return useMutation(
    async ({path}: {path: string}) => {
      // welcome to draft Web Publish flow!

      // right now the doc is a draft and we want to put it on a site

      // 1. re-implement usePublishDraft
      // 1. publish the document to the site

      const docId = draftId
      if (!docId) throw new Error('No draftId provided to useSitePublishDraft')
      const publication = await draftsClient.publishDraft({documentId: docId})
      const document = publication.document
      if (!document) throw new Error('No document in new publication?!')

      // 1. get the account ID of the publisher
      const webUrl = publication.document?.webUrl

      if (!webUrl) {
        // Bailing because no webUrl on this draft. this should not happen because useSitePublishDraft should only be called on drafts that have a webUrl set
        return {
          publication,
          docId,
        }
      }
      // const wellKnownResponse = await fetch(`${webUrl}/api/mintter-well-known`)
      // if (!wellKnownResponse.ok)
      //   throw new Error(
      //     `Failed to query well-known of site when determining publisher id. Status: ${wellKnownResponse.status}`,
      //   )
      // const siteWellKnown = await wellKnownResponse.json()
      // const publisherId: string | undefined =
      //   siteWellKnown?.account_id ?? String(siteWellKnown?.account_id)

      // if (!publisherId) {
      //   throw new Error(
      //     'Publisher id could not be found from site well-known response',
      //   )
      // }

      await performWebPublish(document, webUrl, path, publication.version)

      return {
        publication,
        docId,
      }
    },
    {
      onSuccess: ({publication, docId}, input) => {
        appInvalidateQueries([queryKeys.PUBLICATION_CHANGES, input])
        appInvalidateQueries([queryKeys.GET_PUBLICATION, docId])
        appInvalidateQueries([queryKeys.GET_PUBLICATION_LIST])
        navigate({
          key: 'publication',
          documentId: docId,
          versionId: publication.version,
        })
        appInvalidateQueries([queryKeys.GET_SITE_PUBLICATIONS, docId])
        appInvalidateQueries([queryKeys.GET_DOC_SITE_PUBLICATIONS, docId])
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
          queryKeys.GET_DOC_SITE_PUBLICATIONS,
          input.document?.id,
        ])
        webPubs.forEach((webPub) =>
          appInvalidateQueries([
            queryKeys.GET_SITE_PUBLICATIONS,
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
        appInvalidateQueries([queryKeys.GET_SITE_PUBLICATIONS, input.hostname])
      },
    },
  )
}
