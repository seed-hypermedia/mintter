import {Button, Dialog, TextArea, XStack} from '@mintter/ui'
import {useState} from 'react'
import {toast} from 'react-hot-toast'
import {useGRPCClient} from '../app-context'

export function ContactsPrompt({refetch}: {refetch?: () => void}) {
  const [peer, setPeer] = useState('')
  const grpcClient = useGRPCClient()
  async function handleConnect() {
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
        refetch?.()
      } catch (err) {
        console.error('Connect Error:', err)
      }
      setPeer('')
    }
  }

  return (
    <Dialog>
      <Dialog.Trigger asChild>
        <Button size="$2">Add Connection</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          // animation="quick"
          opacity={0.5}
          // enterStyle={{opacity: 0}}
          // exitStyle={{opacity: 0}}
        />
        <Dialog.Content
          elevation="$2"
          key="content"
          // animation={[
          //   'quick',
          //   {
          //     opacity: {
          //       overshootClamping: true,
          //     },
          //   },
          // ]}
          // enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
          // exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
          // x={0}
          // scale={1}
          // opacity={1}
          // y={0}
          // padding={0}
        >
          <Dialog.Title>Add a Contact</Dialog.Title>
          <Dialog.Description>
            Enter a contact address to connect
          </Dialog.Description>
          <TextArea
            value={peer}
            onChangeText={setPeer}
            multiline
            numberOfLines={4}
            data-testid="add-contact-input"
          />
          <XStack>
            <Dialog.Close asChild>
              <Button onPress={handleConnect} disabled={!peer}>
                Connect
              </Button>
            </Dialog.Close>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
