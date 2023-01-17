import {styled} from '@app/stitches.config'
import {Button} from '@components/button'
import {dialogContentStyles, overlayStyles} from '@components/dialog-styles'
import {TextField} from '@components/text-field'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {useState} from 'react'

const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)
const StyledContent = styled(DialogPrimitive.Content, dialogContentStyles)

function writePathState(s: string) {
  return s.replace(/[^a-z0-9]/gi, '_')
}
function readPathState(s: string) {
  return s.replace(/_+$/, '')
}

export function usePublicationDialog(docId?: string) {
  const [openSiteId, setOpenSiteId] = useState<null | string>(null)
  const [path, setPath] = useState<string>('')
  function open(siteId: string) {
    setOpenSiteId(siteId)
  }
  return {
    content: (
      <DialogPrimitive.Root
        open={!!openSiteId}
        onOpenChange={(isOpen) => {
          if (!isOpen) setOpenSiteId(null)
        }}
      >
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <StyledContent>
            <DialogPrimitive.Title>
              Publish to {openSiteId}
            </DialogPrimitive.Title>

            <TextField
              id="pretty-path"
              name="pretty-path"
              label="Public /URL (Path)"
              value={path}
              onChange={(e) => {
                setPath(writePathState(e.target.value))
              }}
            />
            <URLPreview>
              https://{openSiteId}/{readPathState(path)}
            </URLPreview>
            <Button
              onClick={() => {
                setOpenSiteId(null)
              }}
            >
              Publish Document
            </Button>
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
