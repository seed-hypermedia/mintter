import {
  AuthorVariant,
  Publication,
  PublicationVariant,
  hmDocument,
} from '@shm/shared'
import {UseQueryOptions, useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {useAccount} from './accounts'
import {useEntityTimeline} from './changes'
import {usePublication} from './documents'
import {queryKeys} from './query-keys'

export function usePublicationVariant({
  documentId,
  versionId,
  variants,
  latest,
  ...options
}: UseQueryOptions<Publication> & {
  documentId?: string
  versionId?: string
  variants?: undefined | PublicationVariant[]
  latest?: boolean
}) {
  const authorVariants = variants?.filter((v) => v.key === 'author') as
    | AuthorVariant[]
    | undefined
  const timelineQuery = useEntityTimeline(documentId)
  let queryVariantVersion: undefined | string = undefined
  let queryDocumentId = documentId
  if (authorVariants?.length) {
    const variantAuthors = new Set(
      authorVariants.map((variant) => variant.author),
    )
    const authorVersions = timelineQuery.data?.authorVersions.filter(
      (authorVersion) => variantAuthors.has(authorVersion.author),
    )
    const activeChanges = new Set()
    authorVersions?.forEach((versionItem) => {
      versionItem.version.split('.').forEach((changeId) => {
        activeChanges.add(changeId)
      })
    })
    if (activeChanges.size) {
      queryVariantVersion = [...activeChanges].join('.')
    } else {
      queryDocumentId = undefined
    }
  }

  const queryVersionId = versionId && !latest ? versionId : queryVariantVersion
  const pubQuery = usePublication(
    {
      id: queryDocumentId,
      version: queryVersionId,
    },
    {
      enabled: options.enabled !== false && !!queryDocumentId,
    },
  )
  let defaultVariantVersion: undefined | string = undefined
  if (!variants) {
    const authorVersion = timelineQuery.data?.authorVersions.find(
      (authorVersion) =>
        authorVersion.author === pubQuery.data?.document?.author,
    )
    defaultVariantVersion = authorVersion?.version
  }
  const variantVersion = queryVariantVersion || defaultVariantVersion
  return {
    ...pubQuery,
    data: {
      publication: pubQuery.data,
      variantVersion,
    },
  }
}

export function useDocumentDrafts(docId: string | undefined) {
  const grpcClient = useGRPCClient()
  const drafts = useQuery({
    queryKey: [queryKeys.GET_PUBLICATION_DRAFTS, docId],
    enabled: !!docId,
    queryFn: async () => {
      const result = await grpcClient.drafts.listDocumentDrafts({
        documentId: docId,
      })
      const drafts = await Promise.all(
        result.drafts.map((draft) =>
          grpcClient.drafts.getDraft({documentId: draft.id}),
        ),
      )
      return drafts.map((doc) => hmDocument(doc))
    },
  })
  return drafts
}

export function usePublicationVariantWithDraft(
  ...args: Parameters<typeof usePublicationVariant>
) {
  const variant = usePublicationVariant(...args)
  const drafts = useDocumentDrafts(variant.data?.publication?.document?.id)
  return {
    ...variant,
    data: {
      publication: variant.data?.publication,
      variantVersion: variant.data?.variantVersion,
      document: drafts.data?.[0] || variant.data.publication?.document,
      isDocumentDraft: drafts.data?.[0] ? true : false,
      drafts: drafts.data,
    },
  }
}

export function useProfilePublication(accountId: string | undefined) {
  const account = useAccount(accountId)
  const pub = usePublicationVariant({
    documentId: account.data?.profile?.rootDocument,
    variants: accountId ? [{key: 'author', author: accountId}] : [],
    latest: true,
  })
  return pub
}

export function useProfilePublicationWithDraft(accountId: string | undefined) {
  const pub = useProfilePublication(accountId)
  const drafts = useDocumentDrafts(pub.data?.publication?.document?.id)
  return {
    ...pub,
    data: {
      publication: pub.data?.publication,
      variantVersion: pub.data?.variantVersion,
      document: drafts.data?.[0] || pub.data.publication?.document,
      isDocumentDraft: drafts.data?.[0] ? true : false,
      drafts: drafts.data,
    },
  }
}
