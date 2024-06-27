import { AccessURLRow } from '@/url'
import { HYPERMEDIA_PUBLIC_WEB_GATEWAY } from '@shm/shared'
import { Button, Spinner, TextArea, XStack, toast } from '@shm/ui'
import { UserPlus } from '@tamagui/lucide-icons'
import { compressToEncodedURIComponent } from 'lz-string'
import { ComponentProps, useMemo, useState } from 'react'
import appError from '../errors'
import { useMyAccount_deprecated } from '../models/accounts'
import { useConnectPeer } from '../models/contacts'
import { useDaemonInfo } from '../models/daemon'
import { usePeerInfo } from '../models/networking'
import {
  AppDialog,
  DialogCloseButton,
  DialogDescription,
  DialogTitle,
  useAppDialog,
} from './dialog'

function AddConnectionButton(props: ComponentProps<typeof Button>) {
  return (
    <Button size="$2" {...props} icon={UserPlus}>
      Add Connection
    </Button>
  )
}
function AddConnectionForm({
  input,
  onClose,
}: {
  onClose: () => void
  input: true | { connectionString?: string; name?: string | undefined }
}) {
  const [peerText, setPeer] = useState('')
  const daemonInfo = useDaemonInfo()
  const account = useMyAccount_deprecated()
  const deviceId = daemonInfo.data?.peerId
  const peerInfo = usePeerInfo(deviceId)

  const connectionString =
    typeof input === 'object' ? input.connectionString : undefined
  const name = typeof input === 'object' ? input?.name : undefined

  const connect = useConnectPeer({
    onSuccess: () => {
      onClose()
      toast.success('Connection Added')
    },
    onError: (error) => {
      appError(`Connect to peer error: ${error?.rawMessage}`, { error })
    },
  })

  const connectInfo = useMemo(() => {
    if (!deviceId || !peerInfo.data?.addrs?.length) return null
    return compressToEncodedURIComponent(
      JSON.stringify({
        a: peerInfo.data?.addrs.map((addr) => {
          return addr.split('/p2p/').slice(0, -1).join('/p2p/')
        }),
        n: account.data?.profile?.alias,
        d: deviceId,
      }),
    )
  }, [
    deviceId,
    peerInfo.data?.addrs?.length, // explicitly using addrs length because the address list is being polled and frequently changes order, which does not affect connecivity
    account.data?.profile?.alias,
  ])
  return (
    <>
      <DialogTitle>Add Connection</DialogTitle>
      <DialogCloseButton />

      {name && connectionString ? (
        <>
          <DialogDescription>
            {name
              ? `Confirm connection to "${name}"`
              : 'Confirm peer connection'}
          </DialogDescription>
        </>
      ) : (
        <>
          <DialogDescription>
            Share your device connection URL with your friends:{' '}
          </DialogDescription>
          {deviceId && (
            <AccessURLRow
              url={`${HYPERMEDIA_PUBLIC_WEB_GATEWAY}/hypermedia-connect/${connectInfo}`}
            />
          )}
          <DialogDescription>
            Paste other people&apos;s connection URL here:
          </DialogDescription>
          <TextArea
            value={peerText}
            onChangeText={setPeer}
            multiline
            numberOfLines={4}
            data-testid="add-contact-input"
          />
          <DialogDescription size={'$1'}>
            You can also paste the full peer address here.
          </DialogDescription>
        </>
      )}
      <XStack jc="space-between">
        <Button
          onPress={() => connect.mutate(connectionString || peerText)}
          disabled={!peerText && !connectionString}
          icon={UserPlus}
        >
          Connect to Peer
        </Button>
        {connect.isLoading ? <Spinner /> : null}
      </XStack>
    </>
  )
}

export function useConfirmConnection() {
  return useAppDialog<{
    connectionString: string
    name?: string | undefined
  }>(AddConnectionForm)
}
export function useAddConnection() {
  return null
}

export function ContactsPrompt() {
  return (
    <AppDialog
      TriggerComponent={AddConnectionButton}
      ContentComponent={AddConnectionForm}
    />
  )
}
