import { AccessoryLayout } from '@/components/accessory-sidebar'
import { Avatar } from '@/components/avatar'
import { useCopyGatewayReference } from '@/components/copy-gateway-reference'
import { useDeleteDialog } from '@/components/delete-dialog'
import { DocumentListItem } from '@/components/document-list-item'
import { FavoriteButton } from '@/components/favoriting'
import Footer, { FooterButton } from '@/components/footer'
import { ListItem, copyLinkMenuItem } from '@/components/list-item'
import { MainWrapperNoScroll } from '@/components/main-wrapper'
import { useMyAccountIds } from '@/models/accounts'
import { useEntityMentions } from '@/models/content-graph'
import {
  useAccountDocuments,
  useProfile
} from '@/models/documents'
import { useResourceFeedWithLatest } from '@/models/feed'
import { getAvatarUrl } from '@/utils/account-url'
import { useNavRoute } from '@/utils/navigation'
import { useNavigate } from '@/utils/useNavigate'
import {
  DocContent,
  Event,
  HMDocument,
  createHmId,
  getDocumentTitle,
  hmId,
  pluralS,
  unpackDocId
} from '@shm/shared'
import {
  BlockQuote,
  Button,
  List,
  Section,
  SizableText,
  View,
  XStack
} from '@shm/ui'
import { PageContainer } from '@shm/ui/src/container'
import { RadioButtons } from '@shm/ui/src/radio-buttons'
import { Trash } from '@tamagui/lucide-icons'
import React, { ReactNode, useMemo } from 'react'
import { VirtuosoHandle } from 'react-virtuoso'
import { EntityCitationsAccessory } from '../components/citations'
import { CopyReferenceButton } from '../components/titlebar-common'
import { AppDocContentProvider } from './document-content-provider'
import { FeedItem, FeedPageFooter, NewUpdatesButton } from './feed'


export function getProfileName(profile: HMDocument | null | undefined) {
  if (!profile) return ''
  return profile.metadata?.name || 'Untitled Account'
}

export default function AccountPage() {
  const route = useNavRoute()
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const accessoryKey = route.accessory?.key
  const replace = useNavigate('replace')
  const accountEntityId = createHmId('a', accountId)
  const mentions = useEntityMentions(accountEntityId)
  const [copyDialogContent, onCopy] = useCopyGatewayReference()
  let accessory: ReactNode = null
  if (accessoryKey === 'citations') {
    accessory = <EntityCitationsAccessory entityId={accountEntityId} />
  }
  return (
    <>
      <AccessoryLayout accessory={accessory}>
        <MainWrapperNoScroll>
          <MainAccountPage />
        </MainWrapperNoScroll>
      </AccessoryLayout>
      {copyDialogContent}
      <Footer>
        {mentions.data?.mentions?.length ? (
          <FooterButton
            active={accessoryKey === 'citations'}
            label={`${mentions.data?.mentions?.length} ${pluralS(
              mentions.data?.mentions?.length,
              'Citation',
            )}`}
            icon={BlockQuote}
            onPress={() => {
              if (route.accessory?.key === 'citations')
                return replace({ ...route, accessory: null })
              replace({ ...route, accessory: { key: 'citations' } })
            }}
          />
        ) : null}
      </Footer>
    </>
  )
}

function MainAccountPage() {
  const route = useNavRoute()

  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const myAccountIds = useMyAccountIds()
  const isMyAccount = myAccountIds.includes(accountId)
  const { data: documents } = useAccountDocuments(
    route.tab === 'documents' ? accountId : undefined,
  )
  const allDocs = useMemo(() => {
    if (route.tab !== 'documents') return []
    const allPubIds = new Set<string>()
    if (!documents) return []
    const docs = documents.documents.map((d) => {
      if (d?.id)
        allPubIds.add(d?.id)
      return { key: 'document', document: d } as const
    })
    return [...docs]
  }, [isMyAccount, route.tab, documents])
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  const scrollRef = React.useRef<VirtuosoHandle>(null)

  let items: Array<
    | 'profile'
    | { key: 'event', event: Event }
    | {
      key: 'document'
      document: HMDocument
    }
    | {
      key: 'draft'
      document: HMDocument
    }
  > = ['profile']
  const feed = useResourceFeedWithLatest(
    route.tab === 'activity' ? hmId('a', accountId).qid : undefined,
  )
  if (route.tab === 'documents') {
    items = allDocs || []
  } else if (route.tab === 'activity') {
    items = feed.data ? feed.data.map(event => ({ key: 'event', event })) : []
  }
  const { content: deleteDialog, open: openDelete } = useDeleteDialog()
  const navigate = useNavigate()
  return (
    <>
      <List
        ref={scrollRef}
        header={<AccountPageHeader />}
        footer={
          route.tab === 'activity' ? <FeedPageFooter feedQuery={feed} /> : null
        }
        items={items}
        onEndReached={() => {
          if (route.tab === 'activity') feed.fetchNextPage()
        }}
        renderItem={({ item }) => {
          if (item === 'profile') {
            return <ProfileDoc />
          }
          if (item.key === 'document' && item.document) {
            const docId = item.document?.id
            return (
              <DocumentListItem
                key={docId}
                document={item.document}
                author={item.author}
                editors={item.editors}
                hasDraft={undefined}
                menuItems={() => [
                  copyLinkMenuItem(() => {
                    const id = unpackDocId(docId)
                    if (!id) return
                    onCopyId({
                      ...id,
                      version: item.document.version || null,
                    })
                  }, 'Document'),
                  {
                    label: 'Delete Document',
                    key: 'delete',
                    icon: Trash,
                    onPress: () => {
                      openDelete({
                        id: docId,
                        title: getDocumentTitle(item.document),
                      })
                    },
                  },
                ]}
                openRoute={{
                  key: 'document',
                  documentId: docId,
                  versionId: item.document.version,
                }}
              />
            )
          } else if (item.key === 'event') {
            return <FeedItem event={item.event} />
          } else if (item.key === 'draft') {
            return (
              <ListItem
                title={getDocumentTitle(item.document)}
                onPress={() => {
                  navigate({
                    key: 'draft',
                    draftId: item.document.id,
                  })
                }}
                theme="yellow"
                backgroundColor="$color3"
                accessory={
                  <Button disabled onPress={() => { }} size="$1">
                    Draft
                  </Button>
                }
              />
            )
          }
          console.log('unrecognized item', item)
        }}
      />
      {deleteDialog}
      {copyDialogContent}
      {route.tab === 'activity' && feed.hasNewItems && (
        <NewUpdatesButton
          onPress={() => {
            scrollRef.current?.scrollTo({ top: 0 })
            feed.refetch()
          }}
        />
      )}
    </>
  )
}

function AccountPageHeader() {
  const route = useNavRoute()
  const replace = useNavigate('replace')
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const myAccountIds = useMyAccountIds()
  const profile = useProfile(accountId)
  const isMyAccount = myAccountIds.includes(accountId)
  const accountEntityUrl = createHmId('a', accountId)
  const accountName = getProfileName(profile.data)
  return (
    <>
      <PageContainer marginTop="$6">
        <Section
          paddingVertical={0}
          gap="$2"
          marginBottom={route.tab !== 'profile' ? '$4' : undefined}
        >
          <XStack gap="$4" alignItems="center" justifyContent="space-between">
            <XStack gap="$4" alignItems="center">
              <Avatar
                id={accountId}
                size={60}
                label={accountName}
                url={getAvatarUrl(profile.data)}
              />
              <SizableText
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                size="$5"
                fontWeight="700"
              >
                {accountName}
              </SizableText>
            </XStack>

            <XStack space="$2">
              {isMyAccount ? null : <FavoriteButton url={accountEntityUrl} />}
              <CopyReferenceButton />
            </XStack>
          </XStack>
          <XStack>
            <RadioButtons
              key={route.tab}
              value={route.tab || 'profile'}
              options={[
                { key: 'profile', label: 'Profile' },
                { key: 'documents', label: 'Documents' },
                { key: 'activity', label: 'Activity' },
              ] as const}
              onValue={(tab) => {
                replace({ ...route, tab })
              }}
            />
          </XStack>
        </Section>
      </PageContainer>
    </>
  )
}

function ProfileDoc({ }: {}) {
  const route = useNavRoute()
  const accountRoute = route.key === 'account' ? route : undefined
  if (!accountRoute) throw new Error('Invalid route, no account id')
  const profile = useProfile(accountRoute.accountId)
  return profile.status == 'success' && profile.data ? (
    <PageContainer>
      <AppDocContentProvider
        routeParams={{ blockRef: accountRoute?.blockId }}
      >
        <DocContent
          document={profile.data}
          focusBlockId={
            accountRoute?.isBlockFocused ? accountRoute.blockId : undefined
          }
        />
      </AppDocContentProvider>
    </PageContainer>
  ) : (
    <View height={1} />
  )
}
