import {DraftActor} from '@app/draft-machine'
import {useMain} from '@app/main-context'
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

function MintterURLRow({doc}: {doc: PublicationActor}) {
  const {title, url} = useSelector(doc, (state) => {
    const {documentId, version} = state.context
    return {
      title: `mintter.com/p/${documentId}/${version}`,
      url: `${
        isProduction ? MINTTER_GATEWAY_URL : 'http://localhost:3000'
      }/p/${documentId}/${version}`,
    }
  })
  return <AccessURLRow url={url} title={title} />
}

function PublishedURLs({docId}: {docId: string}) {
  const publications = useDocPublications(docId)
  return (
    <>
      {publications.data?.map((pub) => {
        return <AccessURLRow key={pub.id} url={'title'} title="pub url" />
      })}
    </>
  )
}

function PublishButtons({onPublish}: {onPublish: (siteId: string) => void}) {
  const sites = useSiteList()
  return (
    <>
      {sites.data?.map((site) => {
        return (
          <Button
            key={site.id}
            onClick={() => {
              onPublish(site.id)
            }}
          >
            {site.id}
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

export function PublishShareButton() {
  const [isPublic, pubParams] = useRoute('/p/:id/:version')
  const [isPublicB, pubParamsB] = useRoute('/p/:id/:version/:block')
  const [draft, draftParams] = useRoute('/d/:id/:tag?')
  const [isOpen, setIsOpen] = useState(false)
  const mainService = useMain()
  const docActor = useSelector(mainService, (state) => state.context.current)
  const docId = pubParams?.id || pubParamsB?.id || draftParams?.id
  const publicationDialog = usePublicationDialog(docId)

  // const isSaving = useSelector(docActor, (state) =>
  //   state.matches('DRAFT.PUBLISH')
  // )
  if (!draft && !isPublic && !isPublicB) return null
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
              const docActor = mainService.getSnapshot().context.current as
                | DraftActor
                | PublicationActor
              if (docActor.id === 'publishDraft' || docActor.id === 'editor') {
                ;(docActor as DraftActor).send('DRAFT.PUBLISH')
                setIsOpen(true)
              } else if (docActor.id === 'publication-machine') {
                setIsOpen(true)
              }
            }}
            className={`titlebar-button success outlined ${
              isOpen ? 'active' : ''
            }`}
            data-testid="button-publish"
            // disabled={isSaving}
          >
            {docActor?.id === 'editor' ? (
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
              <MintterURLRow doc={docActor} />
              <AccessURLRow // getridofme after you fix PublishedURLs
                title="ethosphera.org/p/comingsoon"
                url="https://ethosphera.org/p/comingsoon"
              />
              {docId && <PublishedURLs docId={docId} />}
              <Subheading>Publish to:</Subheading>
              <PublishButtons
                onPublish={(siteId) => {
                  setIsOpen(false)
                  publicationDialog.open(siteId)
                }}
              />
            </Box>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
      {publicationDialog.content}
    </>
  )
}

const Subheading = styled('h3', {
  color: '$primary-text-low',
  fontSize: '$3',
  fontWeight: 300,
  margin: 0,
})
