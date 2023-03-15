import {MainActor} from '@app/hooks/main-actor'
import {useSitePublish} from '@app/hooks/sites'
import {PublicationActor} from '@app/publication-machine'
import {styled} from '@app/stitches.config'
import {Button} from '@components/button'
import {dialogContentStyles, overlayStyles} from '@components/dialog-styles'
import {TextField} from '@components/text-field'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'

const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)
const StyledContent = styled(DialogPrimitive.Content, dialogContentStyles)

function writePathState(s: string) {
  if (s === '/') return '/'
  const basicPath = s.replace(/[^a-z0-9]/gi, '_')
  if (basicPath === 'home') return '/'
  return basicPath
}
function readPathState(s: string) {
  if (s === '/') return '/'
  const basicPath = s.replace(/_+$/, '').toLocaleLowerCase()
  return basicPath
}
const Heading = styled('h2', {
  margin: 0,
  fontSize: '$4',
})
function PublishDialogForm({
  siteId,
  onDone,
  publicationActor,
}: {
  siteId: string
  onDone?: () => void
  publicationActor: PublicationActor
}) {
  const publish = useSitePublish()

  const init = useMemo(() => {
    const docState = publicationActor.getSnapshot()
    const title = docState.context.title
    const path = title ? writePathState(title) : 'untitled'

    return {
      path,
      docId: docState.context.documentId,
      version: docState.context.version,
    }
  }, [])
  const [path, setPath] = useState<string>(init.path)
  const pubUrl = `${siteId}/${
    path === '/' ? '' : path === '' ? `p/${init.docId}` : readPathState(path)
  }`
  return (
    <>
      <Heading>Publish to {siteId}</Heading>
      <TextField
        placeholder={'Unlisted Document'}
        id="pretty-path"
        name="pretty-path"
        label="Public URL (/Path)"
        value={path}
        onChange={(e) => {
          setPath(writePathState(e.target.value))
        }}
      />
      <URLPreview>{pubUrl}</URLPreview>
      <Button
        disabled={publish.isLoading}
        onClick={() => {
          publish
            .mutateAsync({
              hostname: siteId,
              documentId: init.docId,
              version: init.version,
              path: readPathState(path),
            })
            .then(() => {
              onDone?.()
              toast.success(`Document published to ${pubUrl}`, {})
            })
            .catch((e) => {
              console.error(e)
              toast('Error publishing document', {})
            })
        }}
      >
        Publish Document
      </Button>
    </>
  )
}
export function usePublicationDialog(mainActor?: MainActor) {
  const [openSiteHostname, setOpenSiteHostname] = useState<null | string>(null)
  function open(hostname: string) {
    setOpenSiteHostname(hostname)
  }
  return {
    content: (
      <DialogPrimitive.Root
        open={!!openSiteHostname}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOpenSiteHostname(null)
        }}
      >
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <StyledContent>
            {openSiteHostname && mainActor?.type === 'publication' && (
              <PublishDialogForm
                siteId={openSiteHostname}
                publicationActor={mainActor.actor}
                onDone={() => {
                  setOpenSiteHostname(null)
                }}
              />
            )}
          </StyledContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    ),
    open,
  }
}

const URLPreview = styled('p', {
  color: '$success-text-low',
})
