import Footer from '@mintter/app/components/footer'
import {useDraftList} from '@mintter/app/models/documents'
import {
  Button,
  ButtonText,
  Copy,
  Delete,
  DialogDescription,
  DialogTitle,
  List,
  PageContainer,
  RadioButtons,
  Spinner,
  XStack,
} from '@mintter/ui'

import {
  Document,
  PublicationVariant,
  createPublicWebHmUrl,
  unpackHmId,
} from '@mintter/shared'
import {toast} from '@mintter/ui'
import {FileText, Pencil, Trash} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import React, {ReactNode, memo} from 'react'
import {useAppContext} from '../app-context'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {useDeleteDialog} from '../components/delete-dialog'
import {useDeleteDraftDialog} from '../components/delete-draft-dialog'
import {EmptyList} from '../components/empty-list'
import {ListItem, copyLinkMenuItem} from '../components/list-item'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {PublicationListItem} from '../components/publication-list-item'
import {useMyAccount} from '../models/accounts'
import {
  queryDraft,
  queryPublication,
  useAccountPublicationFullList,
  usePublicationFullList,
} from '../models/documents'
import {useGatewayUrl} from '../models/gateway-settings'
import {useWaitForPublication} from '../models/web-links'
import {useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {DraftRoute} from '../utils/routes'
import {useClickNavigate, useNavigate} from '../utils/useNavigate'

export const PublicationListPage = memo(PublicationListPageUnmemo)

export function PublicationListPageUnmemo() {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error('invalid route')

  let content = (
    <PublicationsList
      header={<DocumentTabs />}
      trustedOnly={route.tab === 'trusted'}
    />
  )
  // if (trustedOnly)
  //   content = <PublicationsList trustedOnly={true} key="trusted" />
  if (route.tab === 'drafts') content = <DraftsList />
  if (route.tab === 'mine') content = <MyPublicationsList />

  return (
    <>
      <MainWrapperNoScroll>{content}</MainWrapperNoScroll>
      <Footer />
    </>
  )
}

export function PublishedFirstDocDialog({
  input,
  onClose,
}: {
  input: {docId: string}
  onClose: () => void
}) {
  const {externalOpen} = useAppContext()
  const id = unpackHmId(input.docId)
  if (!id) throw new Error('invalid doc id')
  const gwUrl = useGatewayUrl()
  const url = createPublicWebHmUrl('d', id.eid, {hostname: gwUrl.data})
  const {resultMeta, timedOut} = useWaitForPublication(url, 120)
  return (
    <>
      <DialogTitle>Congrats!</DialogTitle>
      <DialogDescription>
        Your doc has been published. You can share your doc on the public
        Hypermedia gateway:
      </DialogDescription>
      <XStack jc="space-between" ai="center">
        {resultMeta ? (
          <ButtonText
            color="$blue10"
            size="$2"
            fontFamily={'$mono'}
            fontSize="$4"
            onPress={() => {
              externalOpen(url)
            }}
          >
            {url}
          </ButtonText>
        ) : (
          <Spinner />
        )}
        {timedOut ? (
          <DialogDescription theme="red">
            We failed to publish your document to the hypermedia gateway. Please
            try again later.
          </DialogDescription>
        ) : null}
        <Button
          size="$2"
          icon={Copy}
          onPress={() => {
            copyTextToClipboard(url)
            toast.success('Copied link to document')
          }}
        />
      </XStack>
      <Button onPress={onClose}>Done</Button>
    </>
  )
}
const documentTabsOptions = [
  // {key: 'trusted', label: 'Trusted Creators', icon: Verified},
  // {key: 'all', label: 'All Creators', icon: Globe},
  {key: 'mine', label: 'My Documents', icon: FileText},
  {key: 'drafts', label: 'My Drafts', icon: Pencil},
] as const

function DocumentTabs() {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error(`invalid route: ${route.key}`)
  const replace = useNavigate('replace')
  return (
    <PageContainer marginVertical="$6">
      <XStack>
        <RadioButtons
          value={route.tab}
          options={documentTabsOptions}
          onValue={(tab) => {
            replace({...route, tab})
          }}
        />
      </XStack>
    </PageContainer>
  )
}

function MyPublicationsList() {
  const myAccount = useMyAccount()
  const publications = useAccountPublicationFullList(myAccount.data?.id)
  const drafts = useDraftList()
  const {queryClient, grpcClient} = useAppContext()
  const deleteDialog = useDeleteDialog()

  const items = publications.data
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  if (!items) return <Spinner />
  return (
    <>
      <List
        items={items}
        header={<DocumentTabs />}
        renderItem={({item}) => {
          const {publication, author, editors} = item
          if (!publication.document) return null
          const docId = publication.document.id
          if (!docId) return null
          const id = unpackHmId(docId)
          if (!id) return null
          const variants: PublicationVariant[] = [
            {
              key: 'author',
              author: publication.document.author,
            },
          ]
          return (
            <PublicationListItem
              variants={variants}
              openRoute={{
                key: 'publication',
                documentId: docId,
                variants,
              }}
              hasDraft={drafts.data?.documents.find(
                (d) => d.id == publication.document?.id,
              )}
              onPointerEnter={() => {
                if (publication.document?.id) {
                  queryClient.client.prefetchQuery(
                    queryPublication(
                      grpcClient,
                      publication.document.id,
                      publication.version,
                    ),
                  )
                }
              }}
              publication={publication}
              author={author}
              editors={editors}
              menuItems={() => [
                copyLinkMenuItem(() => {
                  onCopyId({
                    ...id,
                    variants,
                    version: publication.version || null,
                  })
                }, 'Publication'),
                {
                  key: 'delete',
                  label: 'Delete Publication',
                  icon: Delete,
                  onPress: () => {
                    deleteDialog.open({
                      id: docId,
                      title: publication?.document?.title,
                    })
                  },
                },
              ]}
            />
          )
        }}
      />
      {copyDialogContent}
      {deleteDialog.content}
    </>
  )
}

export function PublicationsList({
  header,
  trustedOnly,
}: {
  header: ReactNode
  trustedOnly: boolean
}) {
  const publications = usePublicationFullList({trustedOnly})
  const drafts = useDraftList()
  const {queryClient, grpcClient} = useAppContext()
  const deleteDialog = useDeleteDialog()

  const items = publications.data
  const [copyDialogContent, onCopyId] = useCopyGatewayReference()
  if (!items) return <Spinner />
  return (
    <>
      <List
        key={trustedOnly ? 'trusted' : 'all'}
        items={items}
        header={header}
        fixedItemHeight={52}
        onEndReached={() => {
          publications.fetchNextPage()
        }}
        renderItem={({item}) => {
          const {publication, author, editors} = item
          if (!publication.document) return null
          const docId = publication.document.id
          const id = unpackHmId(docId)
          if (!id) return null
          const variants: PublicationVariant[] = [
            {
              key: 'author',
              author: publication.document.author,
            },
          ]
          return (
            <PublicationListItem
              variants={variants}
              openRoute={{
                key: 'publication',
                documentId: docId,
                variants,
              }}
              hasDraft={drafts.data?.documents.find(
                (d) => d.id == publication.document?.id,
              )}
              onPointerEnter={() => {
                if (publication.document?.id) {
                  queryClient.client.prefetchQuery(
                    queryPublication(
                      grpcClient,
                      publication.document.id,
                      publication.version,
                    ),
                  )
                }
              }}
              publication={publication}
              author={author}
              editors={editors}
              menuItems={() => [
                copyLinkMenuItem(() => {
                  onCopyId({
                    ...id,
                    variants,
                    version: publication.version,
                  })
                }, 'Publication'),
                {
                  key: 'delete',
                  label: 'Delete Publication',
                  icon: Delete,
                  onPress: () => {
                    deleteDialog.open({
                      id: docId,
                      title: publication?.document?.title,
                    })
                  },
                },
              ]}
            />
          )
        }}
      />
      {copyDialogContent}
      {deleteDialog.content}
    </>
  )
}

function DraftsList() {
  const drafts = useDraftList()
  const openDraft = useOpenDraft('push')
  if (drafts.isInitialLoading || !drafts.data) {
    return <Spinner />
  }
  if (drafts.data?.documents.length === 0) {
    return (
      <List
        fixedItemHeight={52}
        header={<DocumentTabs />}
        items={['You have no current Drafts.']}
        renderItem={({item}) => {
          return (
            <EmptyList
              description={item}
              action={() => {
                openDraft()
              }}
            />
          )
        }}
      />
    )
  }
  return (
    <List
      header={<DocumentTabs />}
      items={drafts.data.documents}
      fixedItemHeight={52}
      renderItem={({item}) => {
        return <DraftListItem key={item.id} draft={item} />
      }}
      onEndReached={() => {
        console.log('== ~ DraftsList ~ onEndReached')
        drafts.fetchNextPage()
      }}
    />
  )
}

const DraftListItem = React.memo(function DraftListItem({
  draft,
}: {
  draft: Document
}) {
  let title = draft.title || 'Untitled Document'
  const deleteDialog = useDeleteDraftDialog()
  const navigate = useClickNavigate()
  const {queryClient, grpcClient} = useAppContext()
  if (!draft.id) throw new Error('DraftListItem requires an id')
  const draftRoute: DraftRoute = {
    key: 'draft',
    draftId: draft.id,
    variant: null,
  }
  const goToItem = (e: any) => {
    navigate(draftRoute as DraftRoute, e)
  }
  return (
    <>
      <ListItem
        title={title}
        onPointerEnter={() => {
          queryClient.client.prefetchQuery(
            queryDraft({grpcClient, documentId: draft.id}),
          )
        }}
        onPress={goToItem}
        menuItems={[
          {
            label: 'Delete Draft',
            key: 'delete',
            icon: Trash,
            onPress: () => {
              deleteDialog.open({draftId: draft.id})
            },
          },
        ]}
      />
      {deleteDialog.content}
    </>
  )
})
