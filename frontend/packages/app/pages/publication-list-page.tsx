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
  Separator,
  SizableText,
  Spinner,
  TamaguiElement,
  View,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {Virtuoso} from 'react-virtuoso'

import {createPublicWebHmUrl, idToUrl, unpackHmId} from '@mintter/shared'
import {Bookmark, Globe, Pencil} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ComponentProps, useCallback, useEffect, useRef, useState} from 'react'
import {useAppContext} from '../app-context'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useAppDialog} from '../components/dialog'
import {copyLinkMenuItem} from '../components/list-item'
import {MainWrapper, MainWrapperNoScroll} from '../components/main-wrapper'
import {PublicationListItem} from '../components/publication-list-item'
import {queryPublication, usePublicationFullList} from '../models/documents'
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
  const items = publications.data

  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})
  const container = useRef<TamaguiElement>(null)
  const virtuoso = useRef(null)
  const [dimensions, setDimensions] = useState({height: 0, width: 0})
  const handleContainer = useCallback((node: TamaguiElement | null) => {
    container.current = node
    setDimensions({
      height: node?.offsetHeight,
      width: node?.offsetWidth,
    })
  }, [])
  useEffect(() => {
    function handleResize() {
      const node = container.current
      setDimensions({
        height: node?.offsetHeight,
        width: node?.offsetWidth,
      })
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])
  if (items) {
    if (items.length) {
      return (
        <>
          <MainWrapperNoScroll>
            <YStack f={1} ref={handleContainer}>
              <Virtuoso
                ref={virtuoso}
                style={{
                  height: dimensions.height,
                  display: 'flex',
                  overflowY: 'scroll',
                  overflowX: 'hidden',
                }}
                increaseViewportBy={{
                  top: 800,
                  bottom: 800,
                }}
                components={{
                  Header: () => (
                    <XStack jc="center">
                      <YStack
                        alignItems="flex-start"
                        f={1}
                        maxWidth={898}
                        paddingVertical="$4"
                      >
                        <XGroup
                          separator={<Separator backgroundColor={'red'} />}
                        >
                          <ToggleGroupItem
                            label="Trusted Creators"
                            icon={Bookmark}
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
                  ),
                  Footer: () => <View style={{height: 30}} />,
                }}
                id="scroll-page-wrapper"
                totalCount={items.length}
                itemContent={(index) => {
                  const {publication, author, editors} = items[index]
                  const docId = publication.document?.id
                  if (!docId) return null
                  return (
                    <XStack
                      key={publication.document?.id}
                      jc="center"
                      width={dimensions.width}
                    >
                      <PublicationListItem
                        pubContext={trustedOnly ? {key: 'trusted'} : null}
                        openRoute={{
                          key: 'publication',
                          documentId: docId,
                          pubContext: trustedOnly ? {key: 'trusted'} : null,
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
                        menuItems={[
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
          </MainWrapperNoScroll>
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
