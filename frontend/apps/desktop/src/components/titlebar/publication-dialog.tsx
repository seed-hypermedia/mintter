import {usePublication} from '@app/models/documents'
import {useSitePublish} from '@app/models/sites'
import {styled} from '@app/stitches.config'
import {PublicationRoute, useNavRoute} from '@app/utils/navigation'
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
  const basicPath = s.replace(/[^a-z0-9-]/gi, '_')
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
  publicationRoute,
}: {
  siteId: string
  onDone?: () => void
  publicationRoute: PublicationRoute
}) {
  console.log('=== PublishDialogForm')
  const publish = useSitePublish()

  const {data: pub} = usePublication({
    documentId: publicationRoute.documentId,
    versionId: publicationRoute.versionId,
  })

  const init = useMemo(() => {
    const title = pub?.document?.title
    const path = title ? writePathState(title) : 'untitled'

    return {
      path,
      docId: publicationRoute.documentId,
      version: publicationRoute.versionId || '',
    }
  }, [pub])

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
export function usePublicationDialog() {
  console.log(
    '🚀 ~ file: publication-dialog.tsx:103 ~ usePublicationDialog ~ usePublicationDialog:',
  )
  const route = useNavRoute()
  const [openSiteHostname, setOpenSiteHostname] = useState<null | string>(null)
  function open(hostname: string) {
    console.log('OPEN OPEN', hostname)
    setOpenSiteHostname(hostname)
  }

  console.log(
    'openSiteHostname && route.key == publication',
    openSiteHostname && route.key == 'publication',
  )

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
            {openSiteHostname && route.key == 'publication' && (
              <PublishDialogForm
                siteId={openSiteHostname}
                publicationRoute={route}
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
