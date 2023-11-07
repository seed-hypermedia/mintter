import {createHmId} from '@mintter/shared'
import {Heading, Spinner} from '@mintter/ui'
import {useRouter} from 'next/router'
import {PublicationPage} from 'src/doc-page'
import {trpc} from 'src/trpc'
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
  if (!group.data?.group) return <Heading>Group not found</Heading>
  if (groupContent.isInitialLoading) return <Spinner />
  if (!groupContent.data) return <Heading>Not found</Heading>
  const pathItem = groupContent.data.find((item) => item?.pathName === pathName)
  if (!pathItem) return <Heading>Not found</Heading>
  return (
    <PublicationPage
      pathName={pathName}
      documentId={createHmId('d', pathItem.docId.eid)}
      version={pathItem.publication?.version}
      contextGroup={group.data?.group}
    />
  )
}
