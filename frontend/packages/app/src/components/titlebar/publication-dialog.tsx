import {useDraft} from '@mintter/app/src/models/documents'
import {useSitePublish} from '@mintter/app/src/models/sites'
import {NavRoute, useNavRoute} from '@mintter/app/src/utils/navigation'
import {hostnameStripProtocol} from '@mintter/app/src/utils/site-hostname'
import {Publication} from '@mintter/shared'
import {
  Button,
  Container,
  Input,
  Label,
  SizableText,
  Spinner,
  Text,
  XStack,
  styled,
} from '@mintter/ui'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {useMemo, useState} from 'react'
import {toast} from 'react-hot-toast'
import {DialogContent, DialogOverlay} from '../dialog'

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
      <SizableText size="$5" fontWeight="800">
        Publish to {hostnameStripProtocol(init.webUrl)}
      </SizableText>
      {publish.error ? (
        <Container
          backgroundColor="$red5"
          borderColor="$red8"
          borderWidth={1}
          padding="$3"
          borderRadius="$2"
        >
          <Text color="$red11">{(publish.error as any)?.message}</Text>
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

      <SizableText>{pubUrl}</SizableText>
      <XStack justifyContent="space-between">
        <Spinner opacity={publish.isLoading ? 1 : 0} />
        <Button
          disabled={publish.isLoading}
          onPress={() => {
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
          <DialogOverlay />
          <DialogContent>
            {openSiteHostname && (
              <PublishDialogForm
                route={route}
                onDone={() => {
                  setOpenSiteHostname(null)
                }}
              />
            )}
          </DialogContent>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    ),
    open,
  }
}
