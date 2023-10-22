import {Timestamp} from '@bufbuild/protobuf'
import {
  HMPublication,
  PublicationContent,
  UnpackedHypermediaId,
  createHmId,
  formattedDate,
  unpackHmId,
} from '@mintter/shared'
import {HMGroup} from '@mintter/shared/src/json-hm'
import {Button, ButtonText, PageSection, Text, View, YStack} from '@mintter/ui'
import Head from 'next/head'
import {useRouter} from 'next/router'
import {ReactElement, ReactNode} from 'react'
import {GestureResponderEvent} from 'react-native'
import {getGroupView} from 'server/group'
import {AccountAvatarLink} from './account-row'
import Footer from './footer'
import {GroupMetadata} from './group-metadata'
import {OGImageMeta} from './head'
import {useGroupContentUrl} from './publication-page'
import {SitePublicationContentProvider} from './site-embeds'
import {SiteHead} from './site-head'
import {trpc} from './trpc'

export type GroupPageProps = {}

export function GroupPage({}: GroupPageProps) {
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
    mainView = (
      <YStack
        paddingHorizontal="$2"
        $gtMd={{paddingHorizontal: '$3'}}
        $gtLg={{paddingHorizontal: '$4'}}
        gap="$2"
        alignItems="baseline"
        marginTop="$5"
      >
        {listView}
      </YStack>
    )
  } else if (frontPageItem) {
    mainView = (
      <>
        <YStack>{frontDocView}</YStack>
        <YStack
          padding="$2"
          $gtMd={{padding: '$3'}}
          $gtLg={{padding: '$4'}}
          gap="$2"
          alignItems="baseline"
          marginTop="$5"
          borderTopColor="$borderColor"
          borderTopWidth={1}
        >
          {listView}
        </YStack>
      </>
    )
  } else {
    mainView = (
      <YStack
        paddingHorizontal="$2"
        $gtMd={{paddingHorizontal: '$3'}}
        $gtLg={{paddingHorizontal: '$4'}}
        gap="$2"
        alignItems="baseline"
        marginTop="$5"
      >
        {listView}
      </YStack>
    )
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
        <PageSection.Content>
          <YStack
          // paddingHorizontal="$3"
          // $gtMd={{paddingHorizontal: '$4'}}
          // gap="$2"
          // alignItems="baseline"
          >
            {mainView}
          </YStack>
        </PageSection.Content>
        <PageSection.Side>
          <YStack
            className="publication-sidenav-sticky"
            $gtLg={{
              marginTop: 80,
            }}
          >
            <GroupMetadata group={group.data?.group} groupId={groupId} />
          </YStack>
        </PageSection.Side>
      </PageSection.Root>
      <Footer />
    </YStack>
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
    <SitePublicationContentProvider unpackedId={item.docId}>
      <PublicationContent publication={item?.publication} />
    </SitePublicationContentProvider>
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
      <Button
        width="100%"
        chromeless
        tag="a"
        href={href}
        onPress={() => {}}
        size="$4"
        paddingHorizontal="$3"
      >
        {title}
        <View flex={1} />
        {accessory}
      </Button>
    </>
  )
}
