import {MINTTER_LINK_PREFIX} from '@app/constants'
import {Dropdown} from '@app/editor/dropdown'
import {usePublication, prefetchPublication} from '@app/hooks/documents'
import {useAccount} from '@app/hooks/accounts'
import {useSitePublications} from '@app/hooks/sites'
import {
  useNavigate,
  useNavigationActions,
  useNavRoute,
} from '@app/utils/navigation'
import {EmptyList} from '@components/empty-list'
import Footer from '@components/footer'
import {
  Button,
  ButtonText,
  Container,
  Copy,
  Delete,
  ListItem,
  MainWrapper,
  MoreHorizontal,
  Separator,
  Text,
  XStack,
  YStack,
} from '@mintter/ui'
import {useUnpublishDialog} from '@components/unpublish-dialog'
import {WebPublicationRecord, formattedDate} from '@mintter/shared'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {useMemo} from 'react'
import {toast} from 'react-hot-toast'
import {PageProps} from './base'
import {useQueryClient} from '@tanstack/react-query'

export default function SitePage(props: PageProps) {
  const route = useNavRoute()

  const host = route.key === 'site' ? route.hostname : undefined

  let {data, isInitialLoading} = useSitePublications(host)

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
  const nav = useNavigationActions()
  if (!host) throw new Error('Hostname not found for SitePage')

  return (
    <>
      <MainWrapper>
        <Container>
          {isInitialLoading ? (
            <p>loading...</p>
          ) : sortedPubs?.length ? (
            <YStack tag="ul" padding={0}>
              {sortedPubs.map((publication) => (
                <WebPublicationListItem
                  key={publication.documentId}
                  webPub={publication}
                  hostname={host}
                />
              ))}
            </YStack>
          ) : (
            <EmptyList
              description={`Nothing published on ${host} yet.`}
              action={() => {
                nav.openNewDraft(false)
              }}
            />
          )}
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
  const [unpublishDialog, onUnpublishClick] = useUnpublishDialog(
    hostname,
    webPub,
  )
  const {data: publication} = usePublication(webPub.documentId, webPub.version)
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
      {webPub.path === '' ? (
        <ButtonText onPress={goToItem} theme="gray" fontWeight="700" flex={1}>
          {publication?.document?.title}
        </ButtonText>
      ) : webPub.path === '/' ? (
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
        theme="$gray5"
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
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <Button size="$1" circular data-trigger>
              <MoreHorizontal size={12} />
            </Button>
          </Dropdown.Trigger>
          <Dropdown.Portal>
            <Dropdown.Content
              align="start"
              data-testid="library-item-dropdown-root"
            >
              <Dropdown.Item
                data-testid="copy-item"
                onSelect={() => {
                  copyTextToClipboard(
                    `${MINTTER_LINK_PREFIX}${webPub.documentId}?v=${webPub.version}`,
                  )
                  toast.success('Document ID copied successfully')
                }}
                asChild
              >
                <ListItem
                  icon={Copy}
                  size="$2"
                  hoverTheme
                  pressTheme
                  paddingVertical="$2"
                  paddingHorizontal="$4"
                  textAlign="left"
                  space="$0"
                >
                  Copy Document ID
                </ListItem>
              </Dropdown.Item>
              <Separator />
              <Dropdown.Item
                data-testid="delete-item"
                onSelect={(e) => {
                  e.preventDefault()
                  onUnpublishClick()
                }}
                asChild
              >
                <ListItem
                  icon={Delete}
                  size="$2"
                  hoverTheme
                  pressTheme
                  paddingVertical="$2"
                  paddingHorizontal="$4"
                  textAlign="left"
                  space="$0"
                >
                  Un-Publish Document
                </ListItem>
              </Dropdown.Item>
              {unpublishDialog}
            </Dropdown.Content>
          </Dropdown.Portal>
        </Dropdown.Root>
      </XStack>
    </Button>
  )
}
