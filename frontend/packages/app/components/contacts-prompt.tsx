import {Button, Spinner, TextArea, XStack} from '@mintter/ui'
import {ComponentProps, useState} from 'react'
import {toast} from 'react-hot-toast'
import {AppDialog, DialogTitle, DialogDescription, useAppDialog} from './dialog'
import {UserPlus} from '@tamagui/lucide-icons'
import {AccessURLRow} from './url'
import {useDaemonInfo} from '../models/daemon'
import {HYPERMEDIA_PUBLIC_WEB_GATEWAY} from '@mintter/shared'
import {useConnectPeer} from '../models/contacts'

function AddConnectionButton(props: ComponentProps<typeof Button>) {
  return (
    <Button size="$2" {...props} icon={UserPlus}>
      Add Connection
    </Button>
  )
}
function AddConnectionForm(props: {
  onClose: () => void
  input?: string | undefined
}) {
  const [peer, setPeer] = useState('')
  const daemonInfo = useDaemonInfo()
  const deviceId = daemonInfo.data?.deviceId
  const connect = useConnectPeer({
    onSuccess: () => {
      props.onClose()
      toast.success('Connection Added')
    },
    onError: (err) => {
      console.error('Connect Error:', err)
      toast.error('Connection Error : ' + err?.rawMessage)
    },
  })
  return (
    <>
      <DialogTitle>Add Connection</DialogTitle>

      {props.input ? (
        <>
          <DialogDescription>
            Confirm connection to &quot;{props.input.slice(0, 6)}...
            {props.input.slice(-6)}&quot;
          </DialogDescription>
        </>
      ) : (
        <>
          <DialogDescription>
            Share your device connection URL with your friends:
          </DialogDescription>
          {deviceId && (
            <AccessURLRow
              url={`${HYPERMEDIA_PUBLIC_WEB_GATEWAY}/connect-peer/${deviceId}`}
            />
          )}
          <DialogDescription>
            Paste other people&apos;s connection URL here:
          </DialogDescription>
          <TextArea
            value={peer}
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
          onPress={() => connect.mutate(props.input ? props.input : peer)}
          disabled={!peer && !props.input}
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
  return useAppDialog<string>(AddConnectionForm)
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
