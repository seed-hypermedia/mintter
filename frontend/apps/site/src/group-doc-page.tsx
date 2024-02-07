import {createHmId} from '@mintter/shared'
import {Spinner} from '@mintter/ui'
import {useRouter} from 'next/router'
import NotFoundPage from 'pages/404'
import {PublicationPage} from 'src/publication-page'
import {trpc} from 'src/trpc'
import {ErrorPage} from './error-page'
import {GroupPage} from './group-page'

export function GroupDocPage({}) {
  const router = useRouter()
  const pathName = (router.query?.pathName as string) || ''
  const siteInfo = trpc.siteInfo.get.useQuery()
  const queryVersion = (router.query?.versionId as string) || ''
  const queryGroupEid = (router.query?.groupEid as string) || ''
  const groupEid = queryGroupEid || siteInfo.data?.groupEid || ''
  const requestedVersion = queryGroupEid
    ? queryVersion
    : queryVersion || siteInfo.data?.version
  const groupId = createHmId('g', groupEid)
  const isGroupPage = pathName === '-'
  const group = trpc.group.get.useQuery({
    groupId,
    version: requestedVersion,
  })
  const displayVersion = group.data?.group?.version
  const groupContent = trpc.group.listContent.useQuery(
    {
      groupId,
      version: displayVersion,
    },
    {
      enabled: !!displayVersion,
    },
  )

  if (isGroupPage) return <GroupPage />
  if (!group.data?.group) return <ErrorPage title="Group not found" />
  if (groupContent.isInitialLoading) return <Spinner />
  if (!groupContent.data) return <NotFoundPage />
  const pathItem = groupContent.data.find((item) => item?.pathName === pathName)
  if (!pathItem) return <NotFoundPage />
  return (
    <PublicationPage
      pathName={pathName}
      documentId={createHmId('d', pathItem.docId.eid)}
      version={pathItem.publication?.version}
      variants={[{key: 'group', groupId, pathName}]}
      latest={true}
    />
  )
}
