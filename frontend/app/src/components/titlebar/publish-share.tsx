import {DraftActor} from '@app/draft-machine'
import {useMain} from '@app/main-context'
import {useState} from 'react'
import {useRoute} from 'wouter'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import {Box} from '@components/box'
import {useSelector} from '@xstate/react'
import {Icon} from '@components/icon'
import {isProduction, MINTTER_GATEWAY_URL} from '@app/constants'
import {
  PublicationActor,
  PublicationMachineContext,
} from '@app/publication-machine'
import {open} from '@tauri-apps/api/shell'
import {useSiteList} from '@app/hooks'
import {Button} from '@components/button'

// function onCopyWeblink() {
//     if (current) {
//       let context = current.getSnapshot().context as PublicationMachineContext
//       let reference = `${
//         isProduction ? MINTTER_GATEWAY_URL : 'http://localhost:3000'
//       }/p/${context.documentId}/${context.version}`
//       open(reference)
//     }
//   }

function CopyMintterLinkRow({doc}: {doc: PublicationActor}) {
  const reference = useSelector(doc, (state) => {
    const {documentId, version} = state.context
    return `${
      isProduction ? MINTTER_GATEWAY_URL : 'http://localhost:3000'
    }/p/${documentId}/${version}`
  })
  return (
    <button
      onClick={() => {
        open(reference)
      }}
    >
      {reference}
    </button>
  )
}

function PublishButtons() {
  const sites = useSiteList()
  return (
    <>
      {sites.data?.map((site) => {
        return (
          <Button
            key={site.id}
            onClick={() => {
              // uh
            }}
          >
            {site.hostname}
          </Button>
        )
      })}
    </>
  )
}

function ShareSaveTextLOL({actor}: {actor: DraftActor | PublicationActor}) {
  // const s = useSelector(actor, (state) => state.context)

  // want to return "Save" when the user is editing. how to determine that?
  // if (?) return 'Save'

  return 'Share'
}

export function PublishShareButton() {
  const [isPublic, publicParams] = useRoute('/p/:id/:version/:block?')
  const [draft, draftParams] = useRoute('/d/:id')
  const [isOpen, setIsOpen] = useState(false)
  const mainService = useMain()
  const docActor = useSelector(mainService, (state) => state.context.current)
  // const isSaving = useSelector(docActor, (state) =>
  //   state.matches('DRAFT.PUBLISH')
  // )
  if (!draft && !isPublic) return null
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
            className="titlebar-button success outlined"
            data-testid="button-publish"
            // disabled={isSaving}
          >
            {docActor?.id === 'editor' ? (
              <ShareSaveTextLOL actor={docActor} />
            ) : (
              <>
                <Icon name="Globe" />
              </>
            )}
          </button>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content>
            <Box
              css={{
                padding: '$5',
                width: '300px',
                backgroundColor: '$base-component-bg-normal',
                display: 'flex',
                flexDirection: 'column',
                gap: '$4',
                boxShadow: '$3',
                zIndex: 15000099,
              }}
            >
              <h3>Copy Link:</h3>
              <CopyMintterLinkRow doc={docActor} />
              <h3>Publish to Web:</h3>
              <PublishButtons />
            </Box>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  )
}
