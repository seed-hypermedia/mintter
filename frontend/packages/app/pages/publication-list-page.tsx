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
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'

import {createPublicWebHmUrl, idToUrl, unpackHmId} from '@mintter/shared'
import {Globe, Pencil, Verified} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ComponentProps, memo} from 'react'
import {useAppContext} from '../app-context'
import {DeleteDocumentDialog} from '../components/delete-dialog'
import {useAppDialog} from '../components/dialog'
import {copyLinkMenuItem} from '../components/list-item'
import {MainWrapper} from '../components/main-wrapper'
import {PublicationListItem} from '../components/publication-list-item'
import {queryPublication, usePublicationFullList} from '../models/documents'
import {useWaitForPublication} from '../models/web-links'
import {toast} from '../toast'
import {useNavRoute} from '../utils/navigation'
import {useNavigate} from '../utils/useNavigate'

export const PublicationListPage = memo(PublicationListPageUnmemo)

export function PublicationListPageUnmemo({empty}: {empty?: React.ReactNode}) {
  const route = useNavRoute()
  if (route.key !== 'documents') throw new Error('invalid route')
  const trustedOnly = route.tab === 'trusted'
  const draftsOnly = route.tab === 'drafts'
  const allDocs = route.tab == null
  const replace = useNavigate('replace')
  const publications = usePublicationFullList({trustedOnly})
  const drafts = useDraftList()
  const {queryClient, grpcClient} = useAppContext()
  const openDraft = useOpenDraft('push')
  const items = publications.data

  const deleteDialog = useAppDialog(DeleteDocumentDialog, {isAlert: true})

  if (items) {
    if (items.length) {
      return (
        <>
          <MainWrapper>
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
            <Container>
              {items.map((item) => {
                const {publication, author, editors} = item
                const docId = publication.document?.id
                if (!docId) return null
                return (
                  <PublicationListItem
                    key={docId}
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
                )
              })}
            </Container>
            {deleteDialog.content}
          </MainWrapper>
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
