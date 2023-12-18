import {Timestamp} from '@bufbuild/protobuf'
import {
  HMGroup,
  HMPublication,
  PublicationContent,
  UnpackedHypermediaId,
  createHmId,
  formattedDate,
  unpackHmId,
} from '@mintter/shared'
import {Button, ButtonText, Heading, View, YStack} from '@mintter/ui'
import Head from 'next/head'
import {useRouter} from 'next/router'
import NotFoundPage from 'pages/404'
import {ReactElement, ReactNode} from 'react'
import {GestureResponderEvent} from 'react-native'
import {getGroupView} from 'server/group'
import {AccountAvatarLink} from './account-row'
import {ErrorPage} from './error-page'
import {GroupMetadata} from './group-metadata'
import {BasicOGMeta, OGImageMeta} from './head'
import {useGroupContentUrl} from './publication-page'
import {SitePublicationContentProvider} from './site-embeds'
import {SiteHead} from './site-head'
import {MainSiteLayout} from './site-layout'
import {trpc} from './trpc'

export function GroupPage() {
  const router = useRouter()
  const view = getGroupView(router.query.view)
  const siteInfo = trpc.siteInfo.get.useQuery()
  const queryVersion = (router.query?.versionId as string) || ''
  const queryGroupEid = (router.query?.groupEid as string) || ''
  const groupEid = queryGroupEid || siteInfo.data?.groupEid || ''
  const requestedVersion = queryGroupEid
    ? queryVersion
    : queryVersion || siteInfo.data?.version
  const groupId = createHmId('g', groupEid)
  const group = trpc.group.get.useQuery({
    groupId,
    version: requestedVersion,
  })

  const displayVersion = group.data?.group?.version
  const enabledContentQuery = typeof displayVersion === 'string'
  const groupContent = trpc.group.listContent.useQuery(
    {
      groupId,
      version: displayVersion,
    },
    {
      // disable content query if group is not yet loaded
      enabled: enabledContentQuery,
    },
  )

  if (!siteInfo.data?.groupEid) {
    return (
      <ErrorPage
        title="Your site is ready to launch"
        description="Use the secret setup URL to publish your group to this new site."
      />
    )
  }
  const loadedGroup = group.data?.group

  const listView = (
    <ListviewWrapper>
      {groupContent.data
        ? groupContent.data.map((contentItem) => {
            if (contentItem?.pathName === '/') return null
            return (
              contentItem && (
                <GroupContentItem
                  key={contentItem?.pathName}
                  item={contentItem}
                  groupVersion={displayVersion}
                  group={loadedGroup}
                />
              )
            )
          })
        : null}
    </ListviewWrapper>
  )

  let mainView = listView

  const frontPageItem = groupContent.data?.find(
    (item) => item?.pathName === '/',
  )

  const frontDocView = (
    <FrontDoc item={frontPageItem} groupTitle={loadedGroup?.title} />
  )

  if (view == 'front') {
    mainView = frontDocView
  } else if (view == 'list') {
    mainView = listView
  } else if (frontPageItem) {
    mainView = (
      <>
        <YStack>{frontDocView}</YStack>
        {listView}
      </>
    )
  } else {
    mainView = listView
  }
  const ogImageUrl =
    groupEid && displayVersion
      ? `/api/content-image/g/${groupEid}/${displayVersion}/media.png`
      : undefined
  return (
    <>
      <Head>
        {loadedGroup ? (
          <>
            <meta name="hypermedia-entity-id" content={loadedGroup.id} />
            <meta
              name="hypermedia-url"
              content={createHmId('g', groupEid, {
                version: loadedGroup.version,
              })}
            />
            <meta
              name="hypermedia-entity-version"
              content={loadedGroup.version}
            />
            <meta name="hypermedia-entity-title" content={loadedGroup.title} />
            <BasicOGMeta
              title={loadedGroup.title}
              description={loadedGroup.description}
            />
            {ogImageUrl && <OGImageMeta url={ogImageUrl} />}
          </>
        ) : null}
      </Head>
      <MainSiteLayout
        head={
          <SiteHead
            pageTitle={frontPageItem?.publication?.document?.title || undefined}
          />
        }
        rightSide={
          <GroupMetadata group={group.data?.group} groupId={groupId} />
        }
      >
        <YStack>{mainView}</YStack>
      </MainSiteLayout>
    </>
  )
}

function FrontDoc({
  item,
  groupTitle,
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
  groupTitle?: string
}) {
  if (!item?.publication) return <NotFoundPage />
  const frontPageTitle = item.publication?.document?.title
  const hasFrontDocTitle = !!frontPageTitle && frontPageTitle !== groupTitle
  return (
    <YStack
      paddingTop="$5"
      $gtMd={{paddingTop: hasFrontDocTitle ? '$5' : '$11'}}
    >
      {hasFrontDocTitle ? (
        <Heading
          size="$1"
          fontSize={'$2'}
          paddingHorizontal="$5"
          $gtMd={{
            paddingHorizontal: '$6',
          }}
        >
          {frontPageTitle}
        </Heading>
      ) : null}
      <SitePublicationContentProvider unpackedId={item.docId}>
        <PublicationContent publication={item?.publication} />
      </SitePublicationContentProvider>
    </YStack>
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

function ListviewWrapper({children}: {children: ReactNode}) {
  return (
    <YStack
      paddingHorizontal="$2"
      $gtMd={{paddingHorizontal: '$3'}}
      $gtLg={{paddingHorizontal: '$4'}}
      gap="$2"
      alignItems="baseline"
      marginTop="$5"
      paddingBottom="$4"
    >
      {children}
    </YStack>
  )
}
