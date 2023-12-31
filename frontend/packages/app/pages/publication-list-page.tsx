import Footer from '@mintter/app/components/footer'
import {useDraftList} from '@mintter/app/models/documents'
import {
  Button,
  ButtonText,
  Container,
  Copy,
  Delete,
  DialogDescription,
  DialogTitle,
  Separator,
  Spinner,
  View,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {Virtuoso} from 'react-virtuoso'

import {
  Document,
  createPublicWebHmUrl,
  idToUrl,
  unpackHmId,
} from '@mintter/shared'
import {Globe, Pencil, Trash, Verified} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ComponentProps, memo, useRef, useState} from 'react'
import {useAppContext} from '../app-context'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useDeleteDraftDialog} from '../components/delete-draft-dialog'
import {useAppDialog} from '../components/dialog'
import {EmptyList} from '../components/empty-list'
import {ListItem, copyLinkMenuItem} from '../components/list-item'
import {MainWrapperNoScroll} from '../components/main-wrapper'
import {PublicationListItem} from '../components/publication-list-item'
import {
  queryDraft,
  queryPublication,
  usePublicationFullList,
} from '../models/documents'
import {useWaitForPublication} from '../models/web-links'
import {toast} from '../toast'
import {AuthorsVariant, DraftRoute, useNavRoute} from '../utils/navigation'
import {useOpenDraft} from '../utils/open-draft'
import {useClickNavigate, useNavigate} from '../utils/useNavigate'

export const PublicationListPage = memo(PublicationListPageUnmemo)

export function PublicationListPageUnmemo() {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error('invalid route')
  const trustedOnly = route.tab === 'trusted' || route.tab == null
  const draftsOnly = route.tab === 'drafts'

  let content = <PublicationsList />
  // if (trustedOnly)
  //   content = <PublicationsList trustedOnly={true} key="trusted" />
  if (draftsOnly) content = <DraftsList />

  return (
    <>
      <MainWrapperNoScroll>{content}</MainWrapperNoScroll>
      <Footer />
    </>
  )
}

function ToggleGroupItem({
  label,
  icon,
  active,
  onPress,
}: {
  label: string
  icon: ComponentProps<typeof Button>['icon'] | undefined
  active: boolean
  onPress: () => void
}) {
  return (
    <XGroup.Item>
      <Button
        disabled={active}
        icon={icon}
        backgroundColor={active ? '$color7' : undefined}
        onPress={onPress}
      >
        {label}
      </Button>
    </XGroup.Item>
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
  const url = createPublicWebHmUrl('d', id.eid)
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

function DocumentTabs() {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error('invalid route')
  const trustedOnly = route.tab === 'trusted' || route.tab == null
  const draftsOnly = route.tab === 'drafts'
  const allDocs = !trustedOnly && !draftsOnly
  const replace = useNavigate('replace')

  return (
    <XStack jc="center">
      <YStack alignItems="flex-start" f={1} maxWidth={898} paddingVertical="$4">
        <XGroup separator={<Separator backgroundColor={'red'} />}>
          <ToggleGroupItem
            label="Trusted Creators"
            icon={Verified}
            active={trustedOnly}
            onPress={() => {
              if (!trustedOnly) {
                replace({
                  ...route,
                  tab: null,
                })
              }
            }}
          />
          <ToggleGroupItem
            label="All Creators"
            icon={Globe}
            active={allDocs}
            onPress={() => {
              if (!allDocs) {
                replace({
                  ...route,
                  tab: 'all',
                })
              }
            }}
          />
          <ToggleGroupItem
            label="My Drafts"
            icon={Pencil}
            active={draftsOnly}
            onPress={() => {
              if (!draftsOnly) {
                replace({
                  ...route,
                  tab: 'drafts',
                })
              }
            }}
          />
        </XGroup>
      </YStack>
    </XStack>
  )
}

function PublicationsList({}: {}) {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error('invalid route')
  const trustedOnly = route.tab === 'trusted' || route.tab == null
  const publications = usePublicationFullList({trustedOnly})
  const drafts = useDraftList()
  const {queryClient, grpcClient} = useAppContext()
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})
  const virtuoso = useRef(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [containerHeight, setContainerHeight] = useState(0)
  const items = publications.data
  if (!items) return <Spinner />
  return (
    <YStack
      f={1}
      height={'100%'}
      onLayout={(e) => {
        setContainerHeight(e.nativeEvent.layout.height)
        setContainerWidth(e.nativeEvent.layout.width)
      }}
    >
      <Virtuoso
        key={trustedOnly ? 'trusted' : 'all'}
        fixedItemHeight={42}
        ref={virtuoso}
        style={{
          height: containerHeight,
          display: 'flex',
          overflowY: 'scroll',
          overflowX: 'hidden',
        }}
        increaseViewportBy={{
          top: 800,
          bottom: 800,
        }}
        components={{
          Header: () => <DocumentTabs />,
          Footer: () => <View style={{height: 30}} />,
        }}
        id="scroll-page-wrapper"
        totalCount={items?.length || 0}
        itemContent={(index) => {
          const item = items?.[index]
          if (!item) return null
          const {publication, author, editors} = item
          if (!publication.document) return null
          const docId = publication.document.id
          const variant: AuthorsVariant = {
            key: 'authors',
            authors: [publication.document.author],
          }
          return (
            <XStack
              key={publication.document?.id}
              jc="center"
              width={containerWidth}
            >
              <PublicationListItem
                variant={variant}
                openRoute={{
                  key: 'publication',
                  documentId: docId,
                  variant,
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
                  copyLinkMenuItem(
                    idToUrl(docId, undefined, publication.version),
                    'Publication',
                  ),
                  {
                    key: 'delete',
                    label: 'Delete Publication',
                    icon: Delete,
                    onPress: () => {
                      deleteDialog.open(docId)
                    },
                  },
                ]}
              />
            </XStack>
          )
        }}
      />
      {deleteDialog.content}
    </YStack>
  )
}

function DraftsList() {
  const drafts = useDraftList()
  const openDraft = useOpenDraft('push')
  return (
    <YStack f={1}>
      <DocumentTabs />
      <Container>
        {drafts.isInitialLoading ? (
          <Spinner />
        ) : drafts.data?.documents.length ? (
          <YStack>
            {drafts.data.documents.map((draft) => (
              <DraftListItem key={draft.id} draft={draft} />
            ))}
          </YStack>
        ) : (
          <EmptyList
            description="You have no current Drafts."
            action={() => {
              openDraft()
            }}
          />
        )}
      </Container>
    </YStack>
  )
}

function DraftListItem({draft}: {draft: Document}) {
  let title = draft.title || 'Untitled Document'
  const deleteDialog = useDeleteDraftDialog()
  const navigate = useClickNavigate()
  const {queryClient, grpcClient} = useAppContext()
  if (!draft.id) throw new Error('DraftListItem requires an id')
  const draftRoute: DraftRoute = {key: 'draft', draftId: draft.id}
  const goToItem = (e: any) => {
    navigate(draftRoute, e)
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
        accessory={<></>}
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
}
