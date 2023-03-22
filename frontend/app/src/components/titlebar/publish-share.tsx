import {isProduction, MINTTER_GATEWAY_URL} from '@app/constants'
import {MainActor} from '@app/hooks/main-actor'
import {useDocPublications, useSiteList} from '@app/hooks/sites'
import {PublicationActor} from '@app/publication-machine'
import {styled} from '@app/stitches.config'
import {EXPERIMENTS} from '@app/utils/experimental'
import {useNostr} from '@app/utils/nostr'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {dialogContentStyles, overlayStyles} from '@components/dialog-styles'
import {Icon} from '@components/icon'
import {TextField} from '@components/text-field'
import {AccessURLRow} from '@components/url'
import {WebPublicationRecord} from '@mintter/shared'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {UseQueryResult} from '@tanstack/react-query'
import {useSelector} from '@xstate/react'
import {useEffect, useRef, useState} from 'react'
import {toast} from 'react-hot-toast'
import {useRoute} from 'wouter'
import {usePublicationDialog} from './publication-dialog'

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
  }/p/${docId}?v=${version}`
}

function MintterURLRow({doc}: {doc: PublicationActor}) {
  const {title, url} = useSelector(doc, (state) => {
    const {documentId, version} = state.context
    return {
      title: `mintter.com/p/${documentId}`,
      url: getMintterPublicURL(documentId, version),
    }
  })
  return <AccessURLRow url={url} title={title} />
}

function PublishedURLs({
  publications,
  doc,
}: {
  publications: UseQueryResult<WebPublicationRecord[]>
  doc: MainActor['actor']
}) {
  if (!publications.data) {
    if (publications.isLoading) return <div>Loading...</div>
    if (publications.error) return <div>Failed to load.</div>
  }
  if (publications.data && publications.data?.length === 0)
    return <MintterURLRow doc={doc} />
  return (
    <>
      <Subheading>Public on the Web:</Subheading>
      {publications.data?.map((pub) => {
        const shortHost = hostnameStripProtocol(pub.hostname)
        const shortURL = pub.path
          ? pub.path === '/'
            ? shortHost
            : `${shortHost}/${pub.path}`
          : `${shortHost}/p/${pub.documentId}?v=${pub.version}`
        const fullURL = pub.path
          ? pub.path === '/'
            ? pub.hostname
            : `${pub.hostname}/${pub.path}`
          : `${pub.hostname}/p/${pub.documentId}?v=${pub.version}`
        return (
          <AccessURLRow
            key={`${pub.documentId}/${pub.version}`}
            url={fullURL}
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
            {hostnameStripProtocol(site.hostname)}
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
  let isSaving = useRef(false)
  useEffect(() => {
    if (mainActor.type == 'publication') {
      isSaving.current = false
    } else {
      mainActor.actor.subscribe((state) => {
        if (state.matches('editing.saving')) {
          // console.log('subscribe change TRUE!', state.value)
          isSaving.current = true
        } else {
          // console.log('subscribe change FALSE!', state.value)
          isSaving.current = false
        }
      })
    }
  }, [mainActor])

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
            disabled={isSaving.current}
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
            } ${isSaving.current ? 'disabled' : ''}`}
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
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="end"
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
              {docId && (
                <PublishedURLs
                  publications={publications}
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
