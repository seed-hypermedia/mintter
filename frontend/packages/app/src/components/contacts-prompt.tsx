import {Button, TextArea, XStack} from '@mintter/ui'
import {ComponentProps, useState} from 'react'
import {toast} from 'react-hot-toast'
import {useGRPCClient} from '../app-context'
import {AppDialog, DialogTitle, DialogDescription} from './dialog'

function AddConnectionButton(props: ComponentProps<typeof Button>) {
  return (
    <Button size="$2" {...props}>
      Add Connection
    </Button>
  )
}
function AddConnectionForm(props: {onClose: () => void}) {
  const [peer, setPeer] = useState('')
  const grpcClient = useGRPCClient()
  async function handleConnect() {
    props.onClose()
    if (peer) {
      try {
        await toast.promise(
          grpcClient.networking.connect({addrs: peer.trim().split(',')}),
          {
            loading: 'Connecting to peer...',
            success: 'Connection Succeeded!',
            error: 'Connection Error',
          },
        )
      } catch (err) {
        console.error('Connect Error:', err)
      }
      setPeer('')
    }
  }
  return (
    <>
      <DialogTitle>Add a Contact</DialogTitle>
      <DialogDescription>Enter a contact address to connect</DialogDescription>
      <TextArea
        value={peer}
        onChangeText={setPeer}
        multiline
        numberOfLines={4}
        data-testid="add-contact-input"
      />
      <XStack>
        <Button onPress={handleConnect} disabled={!peer}>
          Connect
        </Button>
      </XStack>
    </>
  )
}
export function ContactsPrompt() {
  return (
    <AppDialog
      TriggerComponent={AddConnectionButton}
      ContentComponent={AddConnectionForm}
    />
  )
}
