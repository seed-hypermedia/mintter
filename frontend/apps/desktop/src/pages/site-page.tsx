import {useAccount} from '@app/models/accounts'
import {prefetchPublication, usePublication} from '@app/models/documents'
import {useSitePublications} from '@app/models/sites'
import {usePopoverState} from '@app/use-popover-state'
import {getDocUrl} from '@app/utils/doc-url'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {useOpenDraft} from '@app/utils/open-draft'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Dropdown} from '@components/dropdown'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {useUnpublishDialog} from '@components/unpublish-dialog'
import {
  formattedDate,
  HYPERDOCS_LINK_PREFIX,
  WebPublicationRecord,
} from '@mintter/shared'
import {
  Button,
  ButtonText,
  Container,
  Copy,
  Delete,
  MainWrapper,
  MoreHorizontal,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useMemo} from 'react'
import {toast} from 'react-hot-toast'

export default function SitePage() {
  const route = useNavRoute()

  const host = route.key === 'site' ? route.hostname : undefined

  let {data, isLoading} = useSitePublications(host)

  const sortedPubs = useMemo(() => {
    // sort path === '/' to the top
    // sort path === '' to the bottom
    return data?.publications.sort((a, b) => {
      if (a.path === '/') return -1
      if (b.path === '/') return 1
      if (a.path === '') return 1
      if (b.path === '') return -1
      return 0
    })
  }, [data])
  const openDraft = useOpenDraft()
  if (!host) throw new Error('Hostname not found for SitePage')

  return (
    <>
      <MainWrapper>
        <Container>
          {isLoading && <Spinner />}
          {sortedPubs ? (
            <YStack tag="ul" padding={0}>
              {sortedPubs.map((publication) => (
                <WebPublicationListItem
                  key={publication.documentId}
                  webPub={publication}
                  hostname={host}
                />
              ))}
            </YStack>
          ) : null}
          {!sortedPubs && !isLoading ? (
            <EmptyList
              description={`Nothing published on ${host} yet.`}
              action={() => {
                openDraft(false)
              }}
            />
          ) : null}
        </Container>
      </MainWrapper>
      <Footer />
    </>
  )
}

function WebPublicationListItem({
  webPub,
  hostname,
}: {
  hostname: string
  webPub: WebPublicationRecord
}) {
  const navigate = useNavigate()
  function goToItem() {
    navigate({
      key: 'publication',
      documentId: webPub.documentId,
      versionId: webPub.version,
    })
  }
  const popoverState = usePopoverState()
  const {deleteDialog, ...dialogState} = useUnpublishDialog({
    pub: webPub,
    hostname,
  })

  const {data: publication} = usePublication({
    documentId: webPub.documentId,
    versionId: webPub.version,
    enabled: !!webPub.documentId,
  })
  const publishedWebHost = publication?.document
    ? publication.document.webUrl || 'https://mintter.com'
    : null
  const {data: author} = useAccount(publication?.document?.author)
  return (
    <Button
      chromeless
      theme="gray"
      tag="li"
      onMouseEnter={() =>
        publication?.document
          ? prefetchPublication(publication.document?.id, publication.version)
          : null
      }
    >
      {webPub.path == '' ? (
        <ButtonText onPress={goToItem} theme="gray" fontWeight="700" flex={1}>
          {publication?.document?.title}
        </ButtonText>
      ) : webPub.path == '/' ? (
        <ButtonText onPress={goToItem} fontWeight="700" flex={1}>
          {publication?.document?.title}
        </ButtonText>
      ) : (
        <ButtonText onPress={goToItem} fontWeight="700" flex={1}>
          {publication?.document?.title}
          <Text
            fontFamily="$body"
            fontSize="$1"
            marginHorizontal="$2"
            opacity={0.5}
          >
            /{webPub.path}
          </Text>
        </ButtonText>
      )}
      <Button
        size="$1"
        theme="$color5"
        onPress={goToItem}
        data-testid="list-item-author"
        className={`item-author`}
      >
        {author?.profile?.alias}
      </Button>
      <Text
        fontFamily="$body"
        fontSize="$2"
        data-testid="list-item-date"
        minWidth="10ch"
        textAlign="right"
      >
        {publication?.document?.updateTime
          ? formattedDate(publication?.document?.updateTime)
          : '...'}
      </Text>
      <XStack>
        <Dropdown.Root {...popoverState}>
          <Dropdown.Trigger circular data-trigger icon={MoreHorizontal} />
          <Dropdown.Portal>
            <Dropdown.Content
              align="start"
              data-testid="library-item-dropdown-root"
            >
              <Dropdown.Item
                data-testid="copy-item"
                onPress={() => {
                  const docUrl = getDocUrl(publication, webPub)
                  if (!docUrl) return
                  copyTextToClipboard(docUrl)
                  toast.success(
                    `Copied ${hostnameStripProtocol(publishedWebHost)} URL`,
                  )
                }}
                asChild
                icon={Copy}
                title={`Copy Document URL on ${hostnameStripProtocol(
                  publishedWebHost,
                )}`}
              />
              <Separator />
              <Dropdown.Item
                data-testid="delete-item"
                onPress={() => {
                  popoverState.onOpenChange(false)
                  dialogState.onOpenChange(true)
                }}
                asChild
                title="Un-Publish Document"
                icon={Delete}
              />
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
        {deleteDialog}
      </XStack>
    </Button>
  )
}
