import {
  AuthorVariant,
  GroupVariant,
  Publication,
  PublicationVariant,
  hmDocument,
  unpackHmId,
} from '@mintter/shared'
import {UseQueryOptions, useQuery} from '@tanstack/react-query'
import {useGRPCClient} from '../app-context'
import {useAccount} from './accounts'
import {useEntityTimeline} from './changes'
import {usePublication} from './documents'
import {useDocumentGroups} from './groups'
import {queryKeys} from './query-keys'

export function usePublicationVariant({
  documentId,
  versionId,
  variants,
  latest,
  mergeChanges,
  ...options
}: UseQueryOptions<Publication> & {
  documentId?: string
  versionId?: string
  variants?: undefined | PublicationVariant[]
  mergeChanges?: string[]
  latest?: boolean
}) {
  const groupVariants = variants?.filter((v) => v.key === 'group') as
    | GroupVariant[]
    | undefined
  const groupVariant = groupVariants ? groupVariants[0] : undefined
  const authorVariants = variants?.filter((v) => v.key === 'author') as
    | AuthorVariant[]
    | undefined
  if (groupVariants && groupVariants.length > 1) {
    throw new Error('Only one group variant is currently allowed')
  }
  if (
    authorVariants &&
    authorVariants.length > 0 &&
    groupVariants &&
    groupVariants.length > 0
  ) {
    throw new Error('Cannot currently specify multiple variant types')
  }
  const docGroups = useDocumentGroups(documentId, {enabled: !!groupVariant})
  const timelineQuery = useEntityTimeline(documentId)
  let queryVariantVersion: undefined | string = undefined
  let queryDocumentId = documentId
  if (groupVariant && docGroups.data && !docGroups.isPreviousData) {
    const docGroupEntry = docGroups.data
      .filter(
        (d) =>
          d.groupId === groupVariant.groupId &&
          d.path === groupVariant.pathName,
      )
      .sort((a, b) => {
        const aTime = a.changeTime?.seconds
        const bTime = b.changeTime?.seconds
        if (!aTime || !bTime) return 0
        return Number(bTime - aTime)
      })[0]
    const groupEntryId =
      typeof docGroupEntry?.rawUrl === 'string'
        ? unpackHmId(docGroupEntry?.rawUrl)
        : null
    if (groupEntryId?.version) {
      queryVariantVersion = groupEntryId?.version
    } else {
      throw new Error(
        `Could not determine version for doc "${documentId}" in group "${groupVariant.groupId}" with name "${groupVariant.pathName}"`,
      )
    }
  } else if (authorVariants?.length) {
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
  const mergedPubQuery = usePublication(
    {
      id: queryDocumentId,
      version: `${pubQuery.data?.version}.${mergeChanges?.join('.')}`,
    },
    {
      enabled:
        options.enabled !== false &&
        !!mergeChanges?.length &&
        !!pubQuery.data?.version,
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
      publication: !!mergeChanges?.length ? mergedPubQuery.data : pubQuery.data,
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
