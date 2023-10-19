import {Publication, unpackDocId} from '@mintter/shared'
import {UseQueryOptions} from '@tanstack/react-query'
import {PublicationRouteContext} from '../utils/navigation'
import {usePublication} from './documents'
import {useGroupContent} from './groups'

export function usePublicationInContext({
  documentId,
  versionId,
  pubContext,
  ...options
}: UseQueryOptions<Publication> & {
  documentId?: string
  versionId?: string
  pubContext?: undefined | PublicationRouteContext
}) {
  const groupContext = pubContext?.key === 'group' ? pubContext : undefined
  const groupContextId = groupContext ? groupContext.groupId : undefined
  const groupContent = useGroupContent(groupContextId)
  let queryVersionId = versionId
  let queryDocumentId = documentId
  const groupContextContent = groupContent.data?.content
  if (
    !queryVersionId &&
    groupContext &&
    groupContextContent &&
    !groupContent.isPreviousData
  ) {
    const contentURL =
      groupContext.pathName && groupContextContent[groupContext.pathName]
    if (!contentURL) {
      // throw new Error(
      //   `Group ${groupContextId} does not contain path "${groupContext.pathName}"`,
      // )
      queryDocumentId = undefined
    }
    const groupItem = contentURL ? unpackDocId(contentURL) : null
    if (groupItem?.docId === documentId) {
      queryVersionId = groupItem?.version || undefined
    } else {
      // the document is not actually in the group. so we should not query for anything.
      // this probably happens as a race condition sometimes while publishing
    }
  }
  // this avoids querying usePublication if we are in a group context and the group content is not yet loaded, or if it has an error. if the route specifies the version directly we are also ready to query
  const pubQueryReady = !!queryVersionId || pubContext?.key !== 'group'
  return usePublication({
    ...options,
    id: queryDocumentId,
    version: queryVersionId,
    trustedOnly: pubContext?.key === 'trusted',
    enabled: options.enabled !== false && pubQueryReady,
  })
}
