import {networkingClient} from '@app/api-clients'
import {CSS} from '@stitches/react'
import {useState} from 'react'
import {toast} from 'react-hot-toast'
import {Button} from './button'
import {Icon} from './icon'
import {Prompt} from './prompt'
import {TextField} from './text-field'

export function ContactsPrompt({
  refetch,
}: {
  refetch?: () => void
  connect?: typeof networkingClient.connect
}) {
  const [peer, setPeer] = useState('')

  async function handleConnect() {
    if (peer) {
      try {
        await toast.promise(
          networkingClient.connect({addrs: peer.trim().split(',')}),
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
      <Prompt.Trigger
        variant="ghost"
        color="primary"
        data-testid="add-contact-button"
        size="1"
        css={{
          all: 'unset',
          padding: '$1',
          borderRadius: '$2',
          backgroundColor: 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          '&:hover': {
            backgroundColor: '$base-component-bg-hover',
          },
        }}
      >
        <Icon name="Add" color="muted" />
        <span style={{marginInline: '0.2em'}}>Invite</span>
      </Prompt.Trigger>
      <Prompt.Portal>
        <Prompt.Content>
          <Prompt.Title>Add a Contact</Prompt.Title>
          <Prompt.Description>
            Enter a contact address to connect
          </Prompt.Description>
          <TextField
            value={peer}
            onChange={(event) => setPeer(event.currentTarget.value)}
            textarea
            rows={3}
            data-testid="add-contact-input"
            containerCss={
              {
                minHeight: 150,
                maxHeight: 150,
                overflow: 'scroll',
              } as CSS
            }
          />
          <Prompt.Actions>
            <Prompt.Close asChild>
              <Button
                data-testid="add-contact-submit"
                size="2"
                onClick={handleConnect}
                disabled={!peer}
              >
                Connect
              </Button>
            </Prompt.Close>
          </Prompt.Actions>
        </Prompt.Content>
      </Prompt.Portal>
    </Prompt.Root>
  )
}
