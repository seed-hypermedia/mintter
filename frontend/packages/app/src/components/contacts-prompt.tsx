import {Button, TextArea} from '@mintter/ui'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {useState} from 'react'
import {toast} from 'react-hot-toast'
import {Prompt} from './prompt'
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
    <Prompt.Root>
      <DialogPrimitive.Trigger asChild>
        <Button size="$2">Add Connection</Button>
      </DialogPrimitive.Trigger>
      <Prompt.Portal>
        <Prompt.Content>
          <Prompt.Title>Add a Contact</Prompt.Title>
          <Prompt.Description>
            Enter a contact address to connect
          </Prompt.Description>
          <TextArea
            value={peer}
            onChangeText={setPeer}
            multiline
            numberOfLines={4}
            data-testid="add-contact-input"
          />
          <Prompt.Actions>
            <Prompt.Close asChild>
              <Button onPress={handleConnect} disabled={!peer}>
                Connect
              </Button>
            </Prompt.Close>
          </Prompt.Actions>
        </Prompt.Content>
      </Prompt.Portal>
    </Prompt.Root>
  )
}
