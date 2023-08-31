import {
  GetServerSideProps,
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next'
import {setAllowAnyHostGetCORS} from 'server/cors'
import {getPageProps, serverHelpers} from 'server/ssr-helpers'
import Head from 'next/head'
import {SiteHead} from '../../../site-head'

import {trpc} from '../../../trpc'
import {
  PageSection,
  Text,
  YStack,
  Footer,
  ButtonText,
  Button,
  SideSectionTitle,
  SideSection,
  View,
  SimpleTooltip,
} from '@mintter/ui'
import {HDGroup, HDPublication} from 'server/json-hd'
import {ReactElement} from 'react'
import {GestureResponderEvent} from 'react-native'
import {Timestamp} from '@bufbuild/protobuf'
import {
  HYPERMEDIA_GROUP_PREFIX,
  entityIdToSitePath,
  formattedDate,
} from '@mintter/shared'
import {AccountAvatarLink, AccountRow} from 'components/account-row'
import {format} from 'date-fns'
import {Paragraph} from 'tamagui'

function GroupOwnerSection({owner}: {owner: string}) {
  return (
    <SideSection>
      <SideSectionTitle>Editor in Chief:</SideSectionTitle>
      <AccountRow account={owner} />
    </SideSection>
  )
}

function GroupEditorsSection({groupEid}: {groupEid: string}) {
  const groupMembers = trpc.group.listMembers.useQuery({
    groupEid,
  })
  if (!groupMembers.data) return null

  return (
    <SideSection>
      <SideSectionTitle>Editors:</SideSectionTitle>
      {groupMembers.data.map((member) => {
        return <AccountRow key={member.account} account={member?.account} />
      })}
    </SideSection>
  )
}

function LastUpdateSection({time}: {time: string}) {
  return (
    <SideSection>
      <SideSectionTitle>Last Update:</SideSectionTitle>

      <SimpleTooltip
        content={format(new Date(time), 'MMMM do yyyy, HH:mm:ss z')}
      >
        <Paragraph color="$blue11">
          {format(new Date(time), 'EEEE, MMMM do, yyyy')}
        </Paragraph>
      </SimpleTooltip>
    </SideSection>
  )
}

function GroupMetadata({
  group,
  groupEid,
}: {
  group?: null | HDGroup
  groupEid: string
}) {
  if (!group) return null
  const time = group.createTime
  return (
    <>
      {group.ownerAccountId && (
        <GroupOwnerSection owner={group.ownerAccountId} />
      )}
      {group.id && <GroupEditorsSection groupEid={groupEid} />}
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
  item: {pathName: string; publication: null | HDPublication}
  group?: null | HDGroup
}) {
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
      href={`${entityIdToSitePath(group?.id)}/${item.pathName}`}
    />
  )
}

export default function GroupPage({
  groupEid,
  version,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const group = trpc.group.get.useQuery({
    groupEid,
    //version
  })
  const groupContent = trpc.group.listContent.useQuery({
    groupEid,
  })

  const loadedGroup = group.data?.group

  return (
    <YStack flex={1}>
      <Head>
        {loadedGroup ? (
          <>
            <meta
              name="hyperdocs-entity-id"
              content={`${HYPERMEDIA_GROUP_PREFIX}${loadedGroup.id}`}
            />
            <meta
              name="hyperdocs-entity-version"
              content={loadedGroup.version}
            />
            <meta name="hyperdocs-entity-title" content={loadedGroup.title} />
          </>
        ) : null}
      </Head>
      <SiteHead
        title={loadedGroup?.title}
        titleHref={`/g/${loadedGroup?.id}`}
      />
      <PageSection.Root flex={1}>
        <PageSection.Side />
        <PageSection.Content>
          {/* {pub ? (
              <PublicationContent publication={pub} />
            ) : publication.isLoading ? (
              <PublicationPlaceholder />
            ) : (
              <YStack
                padding="$4"
                borderRadius="$5"
                elevation="$1"
                borderColor="$color5"
                borderWidth={1}
                backgroundColor="$color3"
                gap="$3"
              >
                <SizableText size="$5" fontWeight="800" textAlign="center">
                  Document not found.
                </SizableText>
                <SizableText color="$color9">
                  Document Id: {documentId}
                </SizableText>
                <SizableText color="$color9">version: {version}</SizableText>
              </YStack>
            )}*/}
          {loadedGroup?.description ? (
            <Text
              paddingVertical="$2"
              borderBottomWidth={1}
              borderColor="$color5"
              marginBottom="$3"
            >
              {loadedGroup?.description}
            </Text>
          ) : null}
          {groupContent.data
            ? groupContent.data.map((contentItem) => {
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
            : null}
        </PageSection.Content>
        <PageSection.Side>
          <YStack className="publication-sidenav-sticky">
            <GroupMetadata group={group.data?.group} groupEid={groupEid} />
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
  let groupEid = params?.groupId ? String(params.groupId) : undefined
  let version = query.v ? String(query.v) : null

  setAllowAnyHostGetCORS(context.res)

  if (!groupEid) return {notFound: true} as const

  const helpers = serverHelpers({})

  const groupRecord = await helpers.group.get.fetch({
    groupEid,
  })

  await helpers.group.listContent.prefetch({
    groupEid,
  })

  return {
    props: await getPageProps(helpers, {groupEid, version}),
  }
}
