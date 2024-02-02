import {
  AuthorVariant,
  GroupVariant,
  Publication,
  PublicationVariant,
  unpackHmId,
} from '@mintter/shared'
import {UseQueryOptions} from '@tanstack/react-query'
import {useEntityTimeline} from './changes'
import {usePublication} from './documents'
import {useDocumentGroups} from './groups'

export function usePublicationVariant({
  documentId,
  versionId,
  variants,
  ...options
}: UseQueryOptions<Publication> & {
  documentId?: string
  versionId?: string
  variants?: undefined | PublicationVariant[]
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
    const docGroupEntry = docGroups.data?.find(
      (d) =>
        d.groupId === groupVariant.groupId && d.path === groupVariant.pathName,
    )
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
    // const contentURL =
    //   groupVariant.pathName && groupContent[groupVariant.pathName]
    // if (!contentURL) {
    //   // throw new Error(
    //   //   `Group ${groupContextId} does not contain path "${groupContext.pathName}"`,
    //   // )
    //   queryDocumentId = undefined
    // }
    // const groupItem = contentURL ? unpackDocId(contentURL) : null
    // if (groupItem?.docId === documentId) {
    //   queryVariantVersion = groupItem?.version || undefined
    // } else {
    //   // the document is not actually in the group. so we should not query for anything.
    //   // this probably happens as a race condition sometimes while publishing
    // }
  } else if (authorVariants?.length) {
    const variantAuthors = new Set(
      authorVariants.map((variant) => variant.author),
    )
    // if (authorVariant.authors.length !== 1 || !variantAuthor)
    //   throw new Error('Authors variant must have exactly one author')
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

  const queryVersionId = versionId ? versionId : queryVariantVersion
  const pubQuery = usePublication({
    ...options,
    id: queryDocumentId,
    version: queryVersionId,
    enabled: options.enabled !== false && !!queryDocumentId,
  })
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
