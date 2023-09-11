import {Publication, getIdsfromUrl} from '@mintter/shared'
import {UseQueryOptions} from '@tanstack/react-query'
import {usePublication} from './documents'
import {PublicationRouteContext} from '../utils/navigation'
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
  const groupContextVersion = groupContext
    ? groupContext.groupVersion
    : undefined
  const groupContent = useGroupContent(groupContextId, groupContextVersion)
  let queryVersionId = versionId
  let queryDocumentId = documentId
  const groupContextContent = groupContent.data?.content
  if (
    !queryVersionId &&
    groupContext &&
    groupContextContent &&
    !groupContent.isPreviousData
  ) {
    const contentURL = groupContextContent[groupContext.pathName]
    if (!contentURL) {
      // throw new Error(
      //   `Group ${groupContextId} does not contain path "${groupContext.pathName}"`,
      // )
      queryDocumentId = undefined
    }
    const [groupContentDocId, groupContentVersion] = getIdsfromUrl(contentURL)
    if (groupContentDocId !== documentId)
      throw new Error(
        `Group ${groupContextId} content for "${groupContext.pathName}" not match route document id "${documentId}", instead has "${groupContentDocId}"`,
      )
    queryVersionId = groupContentVersion
  }
  // this avoids querying usePublication if we are in a group context and the group content is not yet loaded, or if it has an error. if the route specifies the version directly we are also ready to query
  const pubQueryReady = !!queryVersionId || pubContext?.key !== 'group'
  return usePublication({
    ...options,
    documentId: queryDocumentId,
    versionId: queryVersionId,
    enabled: options.enabled !== false && pubQueryReady,
  })
}
