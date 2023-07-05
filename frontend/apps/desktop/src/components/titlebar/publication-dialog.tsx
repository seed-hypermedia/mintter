import {useDraft} from '@app/models/documents'
import {useSitePublish} from '@app/models/sites'
import {styled} from '@app/stitches.config'
import {NavRoute, useNavRoute} from '@app/utils/navigation'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Button} from '@components/button'
import {dialogContentStyles, overlayStyles} from '@components/dialog-styles'
import {Publication} from '@mintter/shared'
import {Container, Input, Label, Spinner, Text, XStack} from '@mintter/ui'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'

const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)
const StyledContent = styled(DialogPrimitive.Content, dialogContentStyles)

function writePathState(s: string) {
  if (s === '/') return '/'
  const basicPath = s
    .trim()
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/gi, '-')
    .toLocaleLowerCase()
  if (basicPath === 'home') return '/'
  return basicPath
}
function readPathState(s: string) {
  if (s === '/') return '/'
  const basicPath = s.replace(/-+$/, '').toLocaleLowerCase()
  return basicPath
}
const Heading = styled('h2', {
  margin: 0,
  fontSize: '$4',
})

function PublishDialogForm({
  onDone,
  route,
}: {
  onDone?: (pub: Publication) => void
  route: NavRoute
}) {
  const draftId = route.key === 'draft' ? route.draftId : undefined
  const publish = useSitePublish(draftId)

  const {data: draft} = useDraft({
    documentId: draftId,
  })
  const init = useMemo(() => {
    const title = draft?.title
    const webUrl = draft?.webUrl
    const path = title ? writePathState(title) : 'untitled'
    return {
      path,
      webUrl,
      docId: draftId,
    }
  }, [draft])

  const [path, setPath] = useState<string>(init.path)
  const pubUrl = `${init.webUrl}/${
    path === '/' ? '' : path === '' ? `d/${init.docId}` : readPathState(path)
  }`
  if (route.key !== 'draft') {
    return null
  }
  return (
    <>
      <Heading>Publish to {hostnameStripProtocol(init.webUrl)}</Heading>
      {publish.error ? (
        <Container
          backgroundColor="$red5"
          borderColor="$red8"
          borderWidth={1}
          padding="$3"
          borderRadius="$2"
        >
          <Text color="$red11">{publish.error?.message}</Text>
        </Container>
      ) : null}
      <Label htmlFor="pretty-path">Public URL (/Path)</Label>
      <Input
        placeholder={'No path name'}
        id="pretty-path"
        value={path}
        onChangeText={(val: string) => {
          setPath(writePathState(val))
        }}
      />

      <URLPreview>{pubUrl}</URLPreview>
      <XStack jc="space-between">
        <Spinner opacity={publish.isLoading ? 1 : 0} />
        <Button
          disabled={publish.isLoading}
          onClick={() => {
            publish
              .mutateAsync({
                path: readPathState(path),
              })
              .then(({publication}) => {
                onDone?.(publication)
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
      </XStack>
    </>
  )
}
export function usePublicationDialog() {
  const route = useNavRoute()
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
            {openSiteHostname && (
              <PublishDialogForm
                route={route}
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
