import {useState} from 'react'
import {useRoute} from 'wouter'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {Box} from '@components/box'
import {useSelector} from '@xstate/react'
import {Icon} from '@components/icon'
import {isProduction, MINTTER_GATEWAY_URL} from '@app/constants'
import {PublicationActor} from '@app/publication-machine'
import {useDocPublications, useSiteList} from '@app/hooks/sites'
import {Button} from '@components/button'
import {styled} from '@app/stitches.config'
import {AccessURLRow} from '@components/url'
import {usePublicationDialog} from './publication-dialog'
import {MainActor} from '@app/hooks/main-actor'
import {WebPublicationRecord} from '@mintter/shared'
import {EXPERIMENTS} from '@app/utils/experimental'
import {useNostr} from '@app/utils/nostr'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {toast} from 'react-hot-toast'
import {dialogContentStyles, overlayStyles} from '@components/dialog-styles'
import {TextField} from '@components/text-field'

const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)
const StyledContent = styled(DialogPrimitive.Content, dialogContentStyles)

function NostrPublishButton({
  onClick,
  doc,
}: {
  onClick: (url: string) => void
  doc: PublicationActor
}) {
  const url = useSelector(doc, (state) => {
    const {documentId, version} = state.context
    return getMintterPublicURL(documentId, version)
  })
  return (
    <Button
      onClick={() => {
        onClick(url)
      }}
    >
      Share on Nostr
    </Button>
  )
}

function NostrPostForm({
  onDone,
  docMainURL,
}: {
  onDone: () => void
  docMainURL: string
}) {
  const nostr = useNostr()
  const [content, setContent] = useState(`${docMainURL} on Mintter`)
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        nostr?.publish(content).then(() => {
          toast.success('Shared on Nostr.')
        })
        onDone()
      }}
    >
      <TextField
        name="content"
        textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value)
        }}
      />
      <Button type="submit">Post</Button>
    </form>
  )
}

const Heading = styled('h2', {
  margin: 0,
  fontSize: '$4',
})

function useNostrPostDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [mainUrl, setMainUrl] = useState('')
  function open(url: string) {
    setMainUrl(url)
    setIsOpen(true)
  }
  return {
    open,
    content: (
      <DialogPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <StyledContent>
            <Heading>Post to Nostr</Heading>
            <NostrPostForm
              docMainURL={mainUrl}
              onDone={() => {
                setIsOpen(false)
              }}
            />
          </StyledContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    ),
  }
}

const forceProductionURL = true

function getMintterPublicURL(docId: string, version: string) {
  return `${
    isProduction || forceProductionURL
      ? MINTTER_GATEWAY_URL
      : 'http://localhost:3000'
  }/p/${docId}/${version}`
}

function MintterURLRow({doc}: {doc: PublicationActor}) {
  const {title, url} = useSelector(doc, (state) => {
    const {documentId, version} = state.context
    return {
      title: `mintter.com/p/${documentId}/${version}`,
      url: getMintterPublicURL(documentId, version),
    }
  })
  return <AccessURLRow url={url} title={title} />
}

function PublishedURLs({
  publications,
  doc,
}: {
  publications?: WebPublicationRecord[]
  doc: MainActor['actor']
}) {
  if (publications && publications.length === 0)
    return <MintterURLRow doc={doc} />
  return (
    <>
      {publications?.map((pub) => {
        const shortURL = pub.path
          ? `${pub.hostname}/${pub.path}`
          : `${pub.hostname}/p/${pub.documentId}/${pub.version}`
        return (
          <AccessURLRow
            key={`${pub.documentId}/${pub.version}`}
            url={`https://${shortURL}`}
            title={shortURL}
          />
        )
      })}
    </>
  )
}

function PublishButtons({
  onPublish,
  publications,
}: {
  onPublish: (hostname: string) => void
  publications?: WebPublicationRecord[]
}) {
  const sites = useSiteList()
  const sitesList = sites.data?.filter(({hostname}) => {
    if (publications?.find((pub) => pub.hostname === hostname)) return false
    return true
  })
  if (sitesList?.length === 0) return null
  return (
    <>
      <Subheading>Publish to:</Subheading>
      {sitesList?.map((site) => {
        return (
          <Button
            key={site.hostname}
            onClick={() => {
              onPublish(site.hostname)
            }}
          >
            {site.hostname}
            <ButtonIcon>
              <Icon name="ExternalLink" />
            </ButtonIcon>
          </Button>
        )
      })}
    </>
  )
}
const ButtonIcon = styled('span', {
  marginHorizontal: 12,
})

export function PublishShareButton({mainActor}: {mainActor: MainActor}) {
  const [isPublic, pubParams] = useRoute('/p/:id/:version')
  const [isPublicB, pubParamsB] = useRoute('/p/:id/:version/:block?')
  const [isDraft, draftParams] = useRoute('/d/:id/:tag?')

  const [isOpen, setIsOpen] = useState(false)
  const docId = pubParams?.id || pubParamsB?.id || draftParams?.id
  const publicationDialog = usePublicationDialog(mainActor)
  const nostrPostDialog = useNostrPostDialog()
  const publications = useDocPublications(docId)

  if (!isDraft && !isPublic && !isPublicB) return null
  return (
    <>
      <PopoverPrimitive.Root
        open={isOpen}
        onOpenChange={(open) => {
          if (open) {
            setIsOpen(true)
          } else {
            setIsOpen(false)
          }
        }}
      >
        <PopoverPrimitive.Trigger asChild>
          <button
            onClick={(e) => {
              e.preventDefault()
              if (isOpen) {
                setIsOpen(false)
                return
              }

              if (mainActor.type == 'draft') {
                mainActor.actor.send('DRAFT.PUBLISH')
              }
              setIsOpen(true)
            }}
            className={`titlebar-button success outlined ${
              isOpen ? 'active' : ''
            }`}
            data-testid="button-publish"
          >
            {mainActor.actor?.id === 'editor' ? (
              draftParams?.tag === 'new' ? (
                'Share'
              ) : (
                'Save'
              )
            ) : (
              <>
                <Icon name="Globe" />
              </>
            )}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal style={{}}>
          <PopoverPrimitive.Content
            style={{
              zIndex: 200000,
            }}
          >
            <Box
              css={{
                width: '300px',
                display: 'flex',
                flexDirection: 'column',
                padding: '$4',
                margin: '$2',
                boxShadow: '$3',
                borderRadius: '$2',
                backgroundColor: '$primary-background-subtle',
                border: '1px solid blue',
                borderColor: '$primary-border-subtle',
                gap: '$4',
              }}
            >
              <Subheading>Public on the Web:</Subheading>
              {docId && (
                <PublishedURLs
                  publications={publications.data}
                  doc={mainActor.actor}
                />
              )}
              <PublishButtons
                publications={publications.data}
                onPublish={(hostname) => {
                  setIsOpen(false)
                  publicationDialog.open(hostname)
                }}
              />
              {EXPERIMENTS.nostr && (
                <>
                  <Subheading>Nostr Network</Subheading>
                  <NostrPublishButton
                    doc={mainActor.actor as PublicationActor}
                    onClick={nostrPostDialog.open}
                  />
                </>
              )}
            </Box>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {publicationDialog.content}
      {nostrPostDialog.content}
    </>
  )
}

const Subheading = styled('h3', {
  color: '$primary-text-low',
  fontSize: '$3',
  fontWeight: 300,
  margin: 0,
})
