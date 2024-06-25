import {
  HYPERMEDIA_ENTITY_TYPES,
  StateStream,
  UnpackedHypermediaId,
  unpackHmId,
  writeableStateStream,
} from '@shm/shared'
import {
  createHmId,
  createPublicWebHmUrl,
} from '@shm/shared/src/utils/entity-id-url'
import {
  Button,
  CheckboxField,
  DialogDescription,
  ErrorToastDecoration,
  SizableText,
  Spinner,
  SuccessToastDecoration,
  XStack,
  YStack,
  copyTextToClipboard,
  toast,
  useStream,
} from '@shm/ui'
import {ReactNode, useState} from 'react'
import {usePushPublication} from '../models/documents'
import {
  useGatewayHost,
  useGatewayUrl,
  usePushOnCopy,
  useSetPushOnCopy,
  useSetPushOnPublish,
} from '../models/gateway-settings'
import {fetchWebLinkMeta} from '../models/web-links'
import {DialogTitle, useAppDialog} from './dialog'

type IsPublishedState = null | boolean // null: determined checked yet
type PushingState =
  | null // not pushing yet
  | false // will not push due to setting
  | true // currently pushing
  | 'string' // error text

export function useCopyGatewayReference() {
  const dialog = useAppDialog(PushToGatewayDialog)
  const gatewayHost = useGatewayHost()
  const gatewayUrl = useGatewayUrl()
  const pushOnCopy = usePushOnCopy()
  const push = usePushPublication()
  function onCopy(input: UnpackedHypermediaId) {
    const publicUrl = createPublicWebHmUrl(input.type, input.eid, {
      version: input.version,
      blockRef: input.blockRef,
      blockRange: input.blockRange,
      variants: input.variants,
      hostname: gatewayUrl.data,
    })
    const [setIsPublished, isPublished] =
      writeableStateStream<IsPublishedState>(null)
    const [setPushingState, pushingState] =
      writeableStateStream<PushingState>(null)
    fetchWebLinkMeta(publicUrl)
      .then((meta) => {
        // toast.success(JSON.stringify(meta))
        const destId = createHmId(input.type, input.eid)
        const correctId = meta?.hmId === destId
        const correctVersion =
          !input.version || meta?.hmVersion === input.version
        if (correctId && correctVersion) {
          setIsPublished(true)
        } else {
          setIsPublished(false)
          if (pushOnCopy.data === 'always') {
            setPushingState(true)
            push
              .mutateAsync(destId)
              .then(() => {
                setIsPublished(true)
                setPushingState(null)
              })
              .catch((e) => {
                setPushingState(e.message)
              })
          } else if (pushOnCopy.data === 'never') {
            setPushingState(false)
          } else {
            // ask
            dialog.open({host: gatewayHost, context: 'copy', ...input})
          }
        }
      })
      .catch((e) => {
        toast.error('Failed to check public web link: ' + e.message)
        setIsPublished(false)
      })
    copyTextToClipboard(publicUrl)
    toast.custom(
      <CopiedToast
        host={gatewayHost}
        isPublished={isPublished}
        pushingState={pushingState}
        hmId={createHmId(input.type, input.eid)}
      />,
      {duration: 8000},
    )
  }
  return [dialog.content, onCopy, gatewayHost] as const
}

function CopiedToast({
  isPublished,
  pushingState,
  host,
  hmId,
}: {
  isPublished: StateStream<IsPublishedState>
  pushingState: StateStream<PushingState>
  host: string
  hmId: string
}) {
  const published = useStream(isPublished)
  const pushing = useStream(pushingState)
  const push = usePushPublication()
  const id = unpackHmId(hmId)
  const entityType = id?.type ? HYPERMEDIA_ENTITY_TYPES[id.type] : 'Entity'
  let indicator: ReactNode = null
  let message: string = ''
  if (pushing === true) {
    indicator = <Spinner />
    message = `Copied ${entityType} URL, pushing to ${host}...`
  } else if (published === null) {
    indicator = <Spinner />
    message = `Copied ${entityType} URL, checking ${host}...`
  } else if (published === true) {
    indicator = <SuccessToastDecoration />
    message = `Copied ${entityType} URL, available on ${host}`
  } else {
    indicator = <ErrorToastDecoration />
    message = `Copied ${entityType} URL, not available on ${host}`
  }
  return (
    <YStack f={1} gap="$3">
      <XStack gap="$4" ai="center">
        {indicator}
        <SizableText flexWrap="wrap">{message}</SizableText>
      </XStack>
      {(pushing === null || pushing === false) && published === false ? (
        <XStack jc="center">
          <Button
            size="$2"
            onPress={() => {
              toast.promise(push.mutateAsync(hmId), {
                loading: `Pushing to ${host}...`,
                success: `Pushed to ${host}`,
                error: (err) => `Failed to push to ${host}: ${err.message}`,
              })
            }}
          >
            Push to {host}
          </Button>
        </XStack>
      ) : null}
    </YStack>
  )
}

export function PushToGatewayDialog({
  input,
  onClose,
}: {
  input: {
    host: string
    context: 'copy' | 'publish'
  } & UnpackedHypermediaId
  onClose: () => void
}) {
  const push = usePushPublication()
  const [shouldDoAlways, setShouldDoAlways] = useState(false)
  const setPushOnCopy = useSetPushOnCopy()
  const setPushOnPublish = useSetPushOnPublish()
  const entityType = input?.type
    ? HYPERMEDIA_ENTITY_TYPES[input.type]
    : 'Entity'
  function setDoEveryTime(everyTime: 'always' | 'never') {
    if (input.context === 'copy') {
      setPushOnCopy.mutate(everyTime)
    } else if (input.context === 'publish') {
      setPushOnPublish.mutate(everyTime)
    }
  }
  let title = `Push to ${input.host}`
  let description = `Push this ${entityType.toLowerCase()} to the public web gateway?`
  if (input.context === 'copy') {
    title = `${entityType} URL Copied. Push to ${input.host}?`
    description = `Could not verify this ${entityType.toLowerCase()} is publicly available. Would you like to push it now?`
  } else if (input.context === 'publish') {
    title = `${entityType} Published. Push to ${input.host}?`
  }
  return (
    <>
      <DialogTitle>{title}</DialogTitle>
      <DialogDescription>{description}</DialogDescription>
      <CheckboxField
        value={shouldDoAlways}
        id="do-every-time"
        onValue={(checked) => setShouldDoAlways(checked)}
      >
        Do this every time
      </CheckboxField>
      <XStack gap="$1">
        <Button
          theme="green"
          size="$2"
          iconAfter={push.isLoading ? <Spinner /> : null}
          onPress={() => {
            if (shouldDoAlways) setDoEveryTime('always')
            push
              .mutateAsync(createHmId(input.type, input.eid))
              .then(() => {
                onClose()
                toast.success(`Pushed to ${input.host}`)
              })
              .catch((e) => {
                toast.error(`Failed to push to ${input.host}: ${e.message}`)
              })
          }}
        >
          Push to Web
        </Button>
        <Button
          chromeless
          size="$2"
          onPress={() => {
            if (shouldDoAlways) setDoEveryTime('never')
            onClose()
          }}
        >
          Dismiss
        </Button>
      </XStack>
    </>
  )
}
