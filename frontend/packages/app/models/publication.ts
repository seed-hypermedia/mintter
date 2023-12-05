import {Publication, unpackDocId} from '@mintter/shared'
import {UseQueryOptions} from '@tanstack/react-query'
import {PublicationVariant} from '../utils/navigation'
import {useEntityTimeline} from './changes'
import {usePublication} from './documents'
import {useGroupContent} from './groups'

export function usePublicationVariant({
  documentId,
  versionId,
  variant,
  ...options
}: UseQueryOptions<Publication> & {
  documentId?: string
  versionId?: string
  variant?: undefined | PublicationVariant
}) {
  console.log('usePubVariant', {documentId, versionId, variant})
  const groupVariant = variant?.key === 'group' ? variant : undefined
  const authorVariant = variant?.key === 'authors' ? variant : undefined
  const groupVariantId = groupVariant ? groupVariant.groupId : undefined
  const groupContentQuery = useGroupContent(groupVariantId)
  const timelineQuery = useEntityTimeline(documentId)
  let queryVariantVersion: undefined | string = undefined
  let queryDocumentId = documentId
  const groupContent = groupContentQuery.data?.content
  console.log({groupContent})
  if (groupVariant && groupContent && !groupContentQuery.isPreviousData) {
    const contentURL =
      groupVariant.pathName && groupContent[groupVariant.pathName]
    if (!contentURL) {
      // throw new Error(
      //   `Group ${groupContextId} does not contain path "${groupContext.pathName}"`,
      // )
      queryDocumentId = undefined
    }
    const groupItem = contentURL ? unpackDocId(contentURL) : null
    if (groupItem?.docId === documentId) {
      queryVariantVersion = groupItem?.version || undefined
    } else {
      // the document is not actually in the group. so we should not query for anything.
      // this probably happens as a race condition sometimes while publishing
    }
  } else if (authorVariant) {
    const variantAuthor = authorVariant.authors[0]
    if (authorVariant.authors.length !== 1 || !variantAuthor)
      throw new Error('Authors variant must have exactly one author')
    const authorVersion = timelineQuery.data?.authorVersions.find(
      (authorVersion) => authorVersion.author === variantAuthor,
    )
    if (authorVersion) {
      queryVariantVersion = authorVersion.version
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
  if (!variant) {
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
