import {connect, ConnectionStatus} from '@app/client'
import {CSS, keyframes, styled} from '@app/stitches.config'
import {debug, error} from '@app/utils/logger'
import {ObjectKeys} from '@app/utils/object-keys'
import {Icon} from '@components/icon'
import {
  createAccountMachine,
  listAccountsMachine,
} from '@components/library/accounts-machine'
import {StyledItem} from '@components/library/library-item'
import * as HoverCard from '@radix-ui/react-hover-card'
import {useActor, useMachine} from '@xstate/react'
import {useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {ActorRefFrom} from 'xstate'
import {Box} from '../box'
import {Button} from '../button'
import {Prompt} from '../prompt'
import {Text} from '../text'
import {TextField} from '../text-field'
import {Section} from './section'
import {SectionError} from './section-error'

export function ContactsSection() {
  const [state, send] = useMachine(() => listAccountsMachine)

  let title = `Contacts (${state.context.listAccounts.length})`

  return (
    <Section
      title={title}
      icon="Person"
      actions={
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <ContactsPrompt />
        </Box>
      }
    >
      {state.context.listAccounts.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {state.context.listAccounts.map(({ref}) => (
            <AccountItem key={ref.id} accountRef={ref} />
          ))}
        </ErrorBoundary>
      ) : null}
    </Section>
  )
}

function ContactsPrompt() {
  const [peer, setPeer] = useState('')

  async function handleConnect() {
    if (peer) {
      try {
        // const connAttempt = await connect(peer.split(','))
        await toast.promise(connect(peer.split(',')), {
          loading: 'Connecting to peer...',
          success: 'Connection Succeeded!',
          error: 'Connection Error',
        })
        setPeer('')
      } catch (err: any) {
        error('Connect Error:', err.message)
      }
    }
  }

  return (
    <Prompt.Root>
      <Prompt.Trigger
        variant="ghost"
        color="primary"
        data-testid="clear-bookmarks"
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
        <Icon name="Add" color="muted" size="1" />
      </Prompt.Trigger>
      <Prompt.Content>
        <Prompt.Title>Connect to Peer</Prompt.Title>
        <Prompt.Description>Enter a peer address to connect</Prompt.Description>
        <TextField
          value={peer}
          onChange={(event: any) => setPeer(event.currentTarget.value)}
          textarea
          rows={3}
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
            <Button size="2" onClick={handleConnect} disabled={!peer}>
              Connect
            </Button>
          </Prompt.Close>
        </Prompt.Actions>
      </Prompt.Content>
    </Prompt.Root>
  )
}
const slideUpAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideRightAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(-2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

const slideDownAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateY(-2px)'},
  '100%': {opacity: 1, transform: 'translateY(0)'},
})

const slideLeftAndFade = keyframes({
  '0%': {opacity: 0, transform: 'translateX(2px)'},
  '100%': {opacity: 1, transform: 'translateX(0)'},
})

const HoverCardContentStyled = styled(HoverCard.Content, {
  minWidth: 130,
  maxWidth: 520,
  backgroundColor: 'white',
  borderRadius: 6,
  padding: '$4',
  boxShadow:
    'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
  '@media (prefers-reduced-motion: no-preference)': {
    animationDuration: '400ms',
    animationTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    willChange: 'transform, opacity',
    '&[data-state="open"]': {
      '&[data-side="top"]': {animationName: slideDownAndFade},
      '&[data-side="right"]': {animationName: slideLeftAndFade},
      '&[data-side="bottom"]': {animationName: slideUpAndFade},
      '&[data-side="left"]': {animationName: slideRightAndFade},
    },
  },
})

export type AccountItemProps = {
  accountRef: ActorRefFrom<ReturnType<typeof createAccountMachine>>
}

function AccountItem({accountRef}: AccountItemProps) {
  let [state] = useActor(accountRef)

  let accountId = state.context.account.id.slice(
    state.context.account.id.length - 8,
  )

  debug('Account State', state.context)

  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        <StyledItem
          color="default"
          css={{
            gap: '$4',
            paddingVertical: '$2',
            paddingHorizontal: '$3',
            marginLeft: '-$6',
          }}
        >
          {typeof state.context.status != 'undefined' ? (
            <Box
              css={{
                width: 7,
                height: 7,
                borderRadius: '$round',
                flex: 'none',
                backgroundColor:
                  state.context.status === ConnectionStatus.CONNECTED
                    ? '$success-normal'
                    : '$base-component-bg-active',
              }}
            />
          ) : null}

          <Text
            size="2"
            data-testid="connection-alias"
            css={{
              userSelect: 'none',
              letterSpacing: '0.01em',
              lineHeight: '$2',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              color: '$$foreground',
              flex: 1,
            }}
          >{`(${state.context.account.id.slice(-5)}) ${
            state.context.account.profile?.alias
          }`}</Text>
        </StyledItem>
      </HoverCard.Trigger>
      <HoverCardContentStyled align="start" portalled>
        <Box
          css={{
            width: 32,
            height: 32,
            backgroundColor: '$base-component-bg-normal',
            borderRadius: '$round',
          }}
        />
        <Box css={{display: 'flex', flexDirection: 'column', gap: '$2'}}>
          <Text fontWeight="bold">{state.context.account.profile?.alias}</Text>
          <Text
            color="muted"
            css={{
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {state.context.account.profile?.bio}
          </Text>
          <Text size="1">{state.context.account.profile?.email}</Text>
          <Text size="1" fontWeight="bold">
            (
            {state.context.status == ConnectionStatus.CONNECTED
              ? 'connected'
              : 'not_connected'}
            )
          </Text>
          <Text
            size="1"
            css={{
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            <b>Acc. ID:</b> {accountId}
          </Text>
          {ObjectKeys(state.context.account.devices).map((device, index) => (
            <Text
              size="1"
              css={{
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              <b>device {index + 1} ID:</b>{' '}
              {String(device).slice(String(device).length - 8)}
            </Text>
          ))}
        </Box>
      </HoverCardContentStyled>
    </HoverCard.Root>
  )
}

function DeviceConnectionStatus({device}: {device: string}) {}
