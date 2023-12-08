import {EmptyList} from '@mintter/app/components/empty-list'
import Footer from '@mintter/app/components/footer'
import {useDraftList} from '@mintter/app/models/documents'
import {useOpenDraft} from '@mintter/app/utils/open-draft'
import {
  Button,
  ButtonText,
  Container,
  Copy,
  Delete,
  DialogDescription,
  DialogTitle,
  ScrollView,
  Separator,
  SizableText,
  Spinner,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'

import {createPublicWebHmUrl, idToUrl, unpackHmId} from '@mintter/shared'
import {Globe, Pencil, Verified} from '@tamagui/lucide-icons'
import {useVirtualizer} from '@tanstack/react-virtual'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ComponentProps, useMemo, useRef} from 'react'
import {useAppContext} from '../app-context'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useAppDialog} from '../components/dialog'
import {copyLinkMenuItem} from '../components/list-item'
import {MainWrapper, MainWrapperNoScroll} from '../components/main-wrapper'
import {PublicationListItem} from '../components/publication-list-item'
import {usePublicationFullList} from '../models/documents'
import {useWaitForPublication} from '../models/web-links'
import {toast} from '../toast'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

export function PublicationListPage({empty}: {empty?: React.ReactNode}) {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error('invalid route')
  const trustedOnly = route.tab === 'trusted'
  const draftsOnly = route.tab === 'drafts'
  const allDocs = route.tab == null
  const replace = useNavigate('replace')
  let publications = usePublicationFullList({trustedOnly})
  let drafts = useDraftList()
  let {queryClient, grpcClient} = useAppContext()
  let openDraft = useOpenDraft('push')
  console.log(route.tab)
  const items = publications.data
  const rowItems = useMemo(() => {
    return items?.map((item) => {
      const {publication} = item
      const docId = publication.document?.id
      const pubContext = trustedOnly ? {key: 'trusted'} : null
      const menuItems = [
        copyLinkMenuItem(
          idToUrl(docId, undefined, publication.version),
          'Publication',
        ),
        {
          key: 'delete',
          label: 'Delete Publication',
          icon: Delete,
          onPress: () => {
            console.log('delete pub', docId)
            deleteDialog.open(docId)
          },
        },
      ]
      const hasDraft = drafts.data?.documents.find((d) => d.id == docId)
      const openRoute = {
        key: 'publication',
        documentId: docId,
        pubContext: trustedOnly ? {key: 'trusted'} : null,
      }
      return {...item, pubContext, menuItems, hasDraft, openRoute}
    })
  }, [items, drafts.data])
  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})
  const scrollContainer = useRef<Element>(null)

  const rowVirtualizer = useVirtualizer({
    count: rowItems?.length || 0,
    getScrollElement: () => scrollContainer.current,
    estimateSize: () => 42,
    overscan: 50,
  })
  if (rowItems) {
    if (rowItems.length) {
      return (
        <>
          <MainWrapperNoScroll>
            <XStack jc="center">
              <YStack
                alignItems="flex-start"
                f={1}
                maxWidth={898}
                paddingVertical="$4"
              >
                <XGroup separator={<Separator backgroundColor={'red'} />}>
                  <ToggleGroupItem
                    label="Trusted Creators"
                    icon={Verified}
                    active={trustedOnly}
                    onPress={() => {
                      if (!trustedOnly) {
                        replace({
                          ...route,
                          tab: 'trusted',
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
                          tab: null,
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
            <ScrollView
              key={route.tab}
              ref={scrollContainer}
              f={1}
              contentContainerStyle={{height: rowVirtualizer.getTotalSize()}}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const {
                  publication,
                  author,
                  editors,
                  pubContext,
                  menuItems,
                  hasDraft,
                  openRoute,
                } = rowItems[virtualRow.index]
                const docId = publication.document?.id
                return (
                  <XStack
                    key={docId}
                    jc="center"
                    position="absolute"
                    top={0}
                    left={0}
                    width={'100%'}
                    height={virtualRow.size}
                    transform={[{translateY: virtualRow.start}]}
                  >
                    <PublicationListItem
                      pubContext={pubContext}
                      openRoute={openRoute}
                      hasDraft={hasDraft}
                      // onPointerEnter={() => {
                      //   queryClient.client.prefetchQuery(
                      //     queryPublication(
                      //       grpcClient,
                      //       publication.document.id,
                      //       publication.version,
                      //     ),
                      //   )
                      // }}
                      publication={publication}
                      author={author}
                      editors={editors}
                      menuItems={menuItems}
                    />
                  </XStack>
                )
              })}
            </ScrollView>
          </MainWrapperNoScroll>
          {deleteDialog.content}
          <Footer />
        </>
      )
    } else {
      return (
        <>
          <MainWrapper>
            <Container>
              {empty || (
                <EmptyList
                  description="You have no Publications yet."
                  action={() => {
                    openDraft()
                  }}
                />
              )}
            </Container>
          </MainWrapper>
          <Footer />
        </>
      )
    }
  }

  if (publications.error) {
    return (
      <MainWrapper>
        <Container>
          <YStack gap="$3" alignItems="flex-start" maxWidth={500} padding="$8">
            <SizableText fontFamily="$body" fontWeight="700" fontSize="$6">
              Publication List Error
            </SizableText>
            <SizableText fontFamily="$body" fontSize="$4">
              {JSON.stringify(publications.error)}
            </SizableText>
            <Button theme="yellow" onPress={() => publications.refetch()}>
              try again
            </Button>
          </YStack>
        </Container>
      </MainWrapper>
    )
  }

  return (
    <>
      <MainWrapper>
        <Container>
          <Spinner />
        </Container>
      </MainWrapper>
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

export default function TrustedPublicationList() {
  const successDialog = useAppDialog(PublishedFirstDocDialog)

  return (
    <>
      <PublicationListPage trustedOnly={true} />
      {successDialog.content}
    </>
  )
}
