import {GetServerSideProps, GetServerSidePropsContext} from 'next'
import Head from 'next/head'
import {SiteHead} from '../../../site-head'

import {Timestamp} from '@bufbuild/protobuf'
import {
  Role,
  UnpackedHypermediaId,
  createPublicWebHmUrl,
  formattedDate,
  unpackHmId,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Footer,
  PageSection,
  SideSection,
  SideSectionTitle,
  SizableText,
  Text,
  Tooltip,
  View,
  YStack,
} from '@mintter/ui'
import {AccountAvatarLink, AccountRow} from 'components/account-row'
import {format} from 'date-fns'
import {ReactElement, ReactNode} from 'react'
import {GestureResponderEvent} from 'react-native'
import {PublicationContent} from '../../../publication-page'
import {GroupView, getGroupPageProps, getGroupView} from '../../../server/group'
import {HMGroup, HMPublication} from '../../../server/json-hm'
import {trpc} from '../../../trpc'

export default function GroupPage({
  groupId,
  version = '',
  view,
}: GroupPageProps) {
  const group = trpc.group.get.useQuery({
    groupId,
    version,
  })
  const groupContent = trpc.group.listContent.useQuery({
    groupId,
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

  return (
    <YStack flex={1}>
      <Head>
        {loadedGroup ? (
          <>
            <meta name="hyperdocs-entity-id" content={loadedGroup.id} />
            <meta
              name="hyperdocs-entity-version"
              content={loadedGroup.version}
            />
            <meta name="hyperdocs-entity-title" content={loadedGroup.title} />
          </>
        ) : null}
      </Head>
      <SiteHead
        siteTitle={loadedGroup?.title}
        pageTitle={frontPageItem?.publication?.document?.title || undefined}
        siteSubheading={loadedGroup?.description}
      />
      <PageSection.Root flex={1}>
        <PageSection.Side />
        <PageSection.Content>{mainView}</PageSection.Content>
        <PageSection.Side>
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
  if (!groupEid) return {notFound: true}
  const view = getGroupView(query.view)
  return await getGroupPageProps({groupEid, context, view, version: ''})
}

function GroupOwnerSection({owner}: {owner: string}) {
  return (
    <SideSection>
      <SideSectionTitle>Editor in Chief:</SideSectionTitle>
      <AccountRow account={owner} />
    </SideSection>
  )
}

function GroupEditorsSection({groupId}: {groupId: string}) {
  const groupMembers = trpc.group.listMembers.useQuery({
    groupId,
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
  return (
    <>
      {group.ownerAccountId && (
        <GroupOwnerSection owner={group.ownerAccountId} />
      )}
      {group.id && <GroupEditorsSection groupId={groupId} />}
      {time && <LastUpdateSection time={time} />}
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
}: {
  item: {pathName: string; publication: null | HMPublication}
  group?: null | HMGroup
}) {
  const groupId = group?.id ? unpackHmId(group?.id) : null
  const groupEid = groupId?.eid
  if (!groupEid) return null
  return (
    <ContentListItem
      title={item.pathName}
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
      href={`${createPublicWebHmUrl('g', groupEid, {hostname: null})}/${
        item.pathName
      }`}
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
  return <PublicationContent publication={item?.publication} />
}

export type GroupPageProps = {
  groupId: string
  version: string
  view: GroupView
}
