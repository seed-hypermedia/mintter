import {GetServerSideProps, GetServerSidePropsContext} from 'next'
import Head from 'next/head'
import {SiteHead} from '../../../src/site-head'

import {Timestamp} from '@bufbuild/protobuf'
import {
  Role,
  UnpackedHypermediaId,
  createHmDocLink,
  createHmId,
  createPublicWebHmUrl,
  formattedDate,
  groupDocUrl,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  PageSection,
  SideSection,
  SideSectionTitle,
  SizableText,
  Text,
  Tooltip,
  View,
  YStack,
} from '@mintter/ui'
import {AccountAvatarLink, AccountRow} from 'src/account-row'
import {format} from 'date-fns'
import {ReactElement, ReactNode} from 'react'
import {GestureResponderEvent} from 'react-native'
import {
  PublicationContent,
  useGroupContentUrl,
} from '../../../src/publication-page'
import {prefetchGroup, getGroupView} from '../../../server/group'
import {HMGroup, HMPublication} from '@mintter/shared/src/json-hm'
import {trpc} from '../../../src/trpc'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import {useRouter} from 'next/router'
import Footer from 'src/footer'
import {OpenInAppLink} from 'src/metadata'
import {OGImageMeta} from 'src/head'
import {SiteStaticPublicationProvider} from 'src/site-static-embeds'

export default function GroupPage({}: GroupPageProps) {
  const router = useRouter()
  const view = getGroupView(router.query.view)
  const version = router.query.v ? String(router.query.v) : ''
  const siteInfo = trpc.siteInfo.get.useQuery()
  const groupEid = router.query.groupEid
    ? String(router.query.groupEid)
    : siteInfo.data?.groupEid || ''
  const groupId = createHmId('g', groupEid)
  const group = trpc.group.get.useQuery({
    groupId,
    version,
  })
  const groupContent = trpc.group.listContent.useQuery({
    groupId,
    version: group?.data?.group?.version || '',
  })

  const loadedGroup = group.data?.group

  const listView = groupContent.data
    ? groupContent.data.map((contentItem) => {
        if (contentItem?.pathName === '/') return null
        return (
          contentItem && (
            <GroupContentItem
              key={contentItem?.pathName}
              item={contentItem}
              groupVersion={version}
              group={loadedGroup}
            />
          )
        )
      })
    : null

  let mainView: ReactNode = listView

  const frontPageItem = groupContent.data?.find(
    (item) => item?.pathName === '/',
  )

  const frontDocView = <FrontDoc item={frontPageItem} />

  if (view == 'front') {
    mainView = frontDocView
  } else if (view == 'list') {
    mainView = listView
  } else if (frontPageItem) {
    mainView = (
      <>
        {frontDocView}
        {listView}
      </>
    )
  } else {
    mainView = listView
  }
  const groupVersion = loadedGroup?.version
  const ogImageUrl =
    groupEid && groupVersion
      ? `/api/content-image/g/${groupEid}/${groupVersion}/media.png`
      : undefined
  return (
    <YStack flex={1}>
      <Head>
        {loadedGroup ? (
          <>
            <meta name="hypermedia-entity-id" content={loadedGroup.id} />
            <meta
              name="hypermedia-entity-version"
              content={loadedGroup.version}
            />
            <meta name="hypermedia-entity-title" content={loadedGroup.title} />

            <meta property="og:title" content={loadedGroup.title} />
            <meta property="og:description" content={loadedGroup.description} />
            {ogImageUrl && <OGImageMeta url={ogImageUrl} />}
          </>
        ) : null}
      </Head>
      <SiteHead
        pageTitle={frontPageItem?.publication?.document?.title || undefined}
      />
      <PageSection.Root>
        <PageSection.Side />
        <PageSection.Content>{mainView}</PageSection.Content>
        <PageSection.Side paddingRight="$4">
          <YStack className="publication-sidenav-sticky">
            <GroupMetadata group={group.data?.group} groupId={groupId} />
          </YStack>
        </PageSection.Side>
      </PageSection.Root>
      <Footer />
    </YStack>
  )
}

export const getServerSideProps: GetServerSideProps = async (
  context: GetServerSidePropsContext,
) => {
  const {params, query} = context
  const groupEid = params?.groupEid ? String(params.groupEid) : undefined
  const version = query.v ? String(query.v) : ''
  if (!groupEid) return {notFound: true}
  const view = getGroupView(query.view)
  const groupId = createHmId('g', groupEid)
  const helpers = serverHelpers({})
  await prefetchGroup(helpers, groupId, version, view)

  return {props: await getPageProps(helpers, context, {})}
}

function GroupOwnerSection({owner}: {owner: string}) {
  return (
    <SideSection>
      <SideSectionTitle>Owner:</SideSectionTitle>
      <AccountRow account={owner} />
    </SideSection>
  )
}

function GroupEditorsSection({group}: {group: HMGroup}) {
  const groupMembers = trpc.group.listMembers.useQuery({
    groupId: group.id || '',
    version: group.version,
  })
  if (!groupMembers.data) return null
  const editors = groupMembers.data.filter(
    (member) => member.role === Role.EDITOR,
  )
  if (!editors.length) return null
  return (
    <SideSection>
      <SideSectionTitle>Editors:</SideSectionTitle>
      {editors.map((member) => {
        return <AccountRow key={member.account} account={member?.account} />
      })}
    </SideSection>
  )
}

function LastUpdateSection({time}: {time: string}) {
  return (
    <SideSection>
      <SideSectionTitle>Last Update:</SideSectionTitle>

      <Tooltip content={format(new Date(time), 'MMMM do yyyy, HH:mm:ss z')}>
        <SizableText color="$blue11">
          {format(new Date(time), 'EEEE, MMMM do, yyyy')}
        </SizableText>
      </Tooltip>
    </SideSection>
  )
}

function GroupMetadata({
  group,
  groupId,
}: {
  group?: null | HMGroup
  groupId: string
}) {
  if (!group) return null
  const time = group.createTime
  const unpackedGroupId = unpackHmId(groupId)
  return (
    <>
      {group.ownerAccountId && (
        <GroupOwnerSection owner={group.ownerAccountId} />
      )}
      {group.id && <GroupEditorsSection group={group} />}
      {time && <LastUpdateSection time={time} />}

      {unpackedGroupId && unpackedGroupId?.type === 'g' && (
        <SideSection>
          <OpenInAppLink
            url={createHmId('g', unpackedGroupId.eid, {version: group.version})}
          />
        </SideSection>
      )}
    </>
  )
}

export function ContentListItem({
  accessory,
  title,
  href,
}: {
  accessory: ReactElement
  title: string
  href: string
}) {
  return (
    <>
      <Button chromeless tag="a" href={href} onPress={() => {}} size="$5">
        {title}
        <View flex={1} />
        {accessory}
      </Button>
    </>
  )
}

export function TimeAccessory({
  time,
  onPress,
}: {
  time: Timestamp | string | undefined
  onPress: (e: GestureResponderEvent) => void
}) {
  return (
    <ButtonText
      fontFamily="$body"
      fontSize="$2"
      data-testid="list-item-date"
      minWidth="10ch"
      textAlign="right"
      onPress={onPress}
    >
      {time ? formattedDate(time) : '...'}
    </ButtonText>
  )
}

function GroupContentItem({
  item,
  group,
  groupVersion,
}: {
  item: {pathName: string; publication: null | HMPublication}
  group?: null | HMGroup
  groupVersion?: string | undefined
}) {
  const groupId = group?.id ? unpackHmId(group?.id) : null
  const groupEid = groupId?.eid
  const contentUrl = useGroupContentUrl(groupEid, groupVersion, item.pathName)
  if (!contentUrl) return null
  return (
    <ContentListItem
      title={item.publication?.document?.title || item.pathName}
      accessory={
        <>
          {item.publication?.document?.editors?.map((editor) => {
            return <AccountAvatarLink key={editor} account={editor} />
          })}
          <TimeAccessory
            time={item.publication?.document?.publishTime}
            onPress={() => {}}
          />
        </>
      }
      href={contentUrl}
    />
  )
}

function FrontDoc({
  item,
}: {
  item:
    | {
        version: string
        pathName: string
        publication: HMPublication | null
        docId: UnpackedHypermediaId & {docId: string}
      }
    | null
    | undefined
}) {
  if (!item?.publication) return <Text>Not Found</Text>

  return (
    <SiteStaticPublicationProvider unpackedId={item.docId}>
      <PublicationContent publication={item?.publication} />
    </SiteStaticPublicationProvider>
  )
}

export type GroupPageProps = {}
