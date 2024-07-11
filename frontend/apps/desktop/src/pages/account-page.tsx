import {AccessoryLayout} from '@/components/accessory-sidebar'
import {Avatar} from '@/components/avatar'
import {useCopyGatewayReference} from '@/components/copy-gateway-reference'
import {DocumentListItem} from '@/components/document-list-item'
import {FavoriteButton} from '@/components/favoriting'
import Footer, {FooterButton} from '@/components/footer'
import {MainWrapperNoScroll} from '@/components/main-wrapper'
import {useProfileWithDraft} from '@/models/accounts'
import {useMyAccountIds} from '@/models/daemon'
import {useAccountDocuments} from '@/models/documents'
import {useEntity} from '@/models/entities'
import {getAvatarUrl} from '@/utils/account-url'
import {useNavRoute} from '@/utils/navigation'
import {useNavigate} from '@/utils/useNavigate'
import {DocContent, HMDocument, createHmId, hmId} from '@shm/shared'
import {
  BlockQuote,
  MainWrapper,
  Section,
  SizableText,
  Spinner,
  XStack,
} from '@shm/ui'
import {PageContainer} from '@shm/ui/src/container'
import {RadioButtons} from '@shm/ui/src/radio-buttons'
import React, {ReactNode} from 'react'
import {EntityCitationsAccessory} from '../components/citations'
import {CopyReferenceButton} from '../components/titlebar-common'
import {AppDocContentProvider} from './document-content-provider'

export function getProfileName(profile: HMDocument | null | undefined) {
  return profile?.metadata?.name || 'Untitled Account'
}

export default function AccountPage() {
  const route = useNavRoute()
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')

  const accessoryKey = route.accessory?.key
  const replace = useNavigate('replace')
  const accountEntityId = createHmId('a', accountId)
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
      <Footer>
        <FooterButton
          active={accessoryKey === 'citations'}
          label={'Citations'}
          icon={BlockQuote}
          onPress={() => {
            if (route.accessory?.key === 'citations')
              return replace({...route, accessory: null})
            replace({...route, accessory: {key: 'citations'}})
          }}
        />
      </Footer>
    </>
  )
}

function MainAccountPage() {
  const route = useNavRoute()
  if (route.key !== 'account')
    throw new Error('Invalid route for MainAccountPage')
  if (!route.accountId) throw new Error('MainAccountPage requires account id')

  let content: null | React.ReactElement = (
    <AccountPageProfile accountId={route.accountId} />
  )
  if (route.tab === 'activity') {
    content = null // todo
  } else if (route.tab === 'contacts') {
    content = null // todo
  } else if (route.tab === 'profile') {
    content = (
      <AccountPageProfile
        accountId={route.accountId}
        blockId={route.blockId}
        isBlockFocused={route.isBlockFocused}
      />
    )
  } else if (route.tab === 'documents') {
    content = <AccountPageDocuments accountId={route.accountId} />
  }
  return (
    <MainWrapper>
      <AccountPageHeader />
      {content}
    </MainWrapper>
  )
}
//   return (
//     <>
//       <List
//         ref={scrollRef}
//         header={<AccountPageHeader />}
//         footer={
//           route.tab === 'activity' ? <FeedPageFooter feedQuery={feed} /> : null
//         }
//         items={items}
//         onEndReached={() => {
//           if (route.tab === 'activity') feed.fetchNextPage()
//         }}
//         renderItem={({ item }) => {
//           if (item === 'profile') {
//             return <ProfileDoc />
//           }
//           if (item.key === 'document' && item.document) {
//             const docId = item.document?.id
//             return (
//               <DocumentListItem
//                 key={docId}
//                 document={item.document}
//                 author={item.author}
//                 editors={item.editors}
//                 hasDraft={undefined}
//                 menuItems={() => [
//                   copyLinkMenuItem(() => {
//                     const id = unpackDocId(docId)
//                     if (!id) return
//                     onCopyId({
//                       ...id,
//                       version: item.document.version || null,
//                     })
//                   }, 'Document'),
//                   {
//                     label: 'Delete Document',
//                     key: 'delete',
//                     icon: Trash,
//                     onPress: () => {
//                       openDelete({
//                         id: docId,
//                         title: getDocumentTitle(item.document),
//                       })
//                     },
//                   },
//                 ]}
//                 openRoute={{
//                   key: 'document',
//                   documentId: docId,
//                   versionId: item.document.version,
//                 }}
//               />
//             )
//           } else if (item.key === 'event') {
//             return <FeedItem event={item.event} />
//           } else if (item.key === 'draft') {
//             return (
//               <ListItem
//                 title={getDocumentTitle(item.document)}
//                 onPress={() => {
//                   navigate({
//                     key: 'draft',
//                     draftId: item.document.id,
//                   })
//                 }}
//                 theme="yellow"
//                 backgroundColor="$color3"
//                 accessory={
//                   <Button disabled onPress={() => { }} size="$1">
//                     Draft
//                   </Button>
//                 }
//               />
//             )
//           }
//           console.log('unrecognized item', item)
//         }}
//       />
//       {deleteDialog}
//       {copyDialogContent}
//       {route.tab === 'activity' && feed.hasNewItems && (
//         <NewUpdatesButton
//           onPress={() => {
//             scrollRef.current?.scrollTo({ top: 0 })
//             feed.refetch()
//           }}
//         />
//       )}
//     </>
//   )
// }

function AccountPageHeader() {
  const route = useNavRoute()
  const replace = useNavigate('replace')
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const myAccountIds = useMyAccountIds()
  const {profile} = useProfileWithDraft(accountId)
  const isMyAccount = myAccountIds.data?.includes(accountId)
  const accountEntityUrl = createHmId('a', accountId)
  const accountName = getProfileName(profile)
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
                url={
                  profile?.metadata.avatar
                    ? getAvatarUrl(profile?.metadata.avatar)
                    : ''
                }
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
              options={
                [
                  {key: 'profile', label: 'Home'},
                  {key: 'documents', label: 'Documents'},
                  {key: 'activity', label: 'Activity'},
                  {key: 'contacts', label: 'Contacts'},
                ] as const
              }
              onValue={(tab) => {
                replace({...route, tab})
              }}
            />
          </XStack>
        </Section>
      </PageContainer>
    </>
  )
}

function AccountPageProfile({
  accountId,
  blockId,
  isBlockFocused,
}: {
  accountId: string
  blockId?: string
  isBlockFocused?: boolean
}) {
  const profile = useEntity(hmId('a', accountId))
  if (profile.isLoading) return <Spinner />
  if (!profile.data?.document) return null
  return (
    <PageContainer>
      <AppDocContentProvider routeParams={{blockRef: blockId}}>
        <DocContent
          document={profile.data?.document}
          focusBlockId={isBlockFocused ? blockId : undefined}
        />
      </AppDocContentProvider>
    </PageContainer>
  )
}

function AccountPageDocuments({accountId}: {accountId: string}) {
  const docs = useAccountDocuments()
  return (
    <PageContainer>
      {docs.data?.documents.map((doc) => {
        return (
          <DocumentListItem
            key={doc.id}
            document={doc}
            author={[]}
            editors={[]}
            hasDraft={undefined}
            menuItems={() => [
              // copyLinkMenuItem(() => {
              //   const id = unpackDocId(docId)
              //   if (!id) return
              //   onCopyId({
              //     ...id,
              //     version: item.document.version || null,
              //   })
              // }, 'Document'),
              // {
              //   label: 'Delete Document',
              //   key: 'delete',
              //   icon: Trash,
              //   onPress: () => {
              //     openDelete({
              //       id: docId,
              //       title: getDocumentTitle(item.document),
              //     })
              //   },
              // },
            ]}
            openRoute={{
              key: 'document',
              documentId: doc.id,
              versionId: doc.version,
            }}
          />
        )
      })}
    </PageContainer>
  )
  return null
}
