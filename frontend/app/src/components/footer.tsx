import {connect as apiConnect, ConnectionStatus} from '@app/client'
import {
  AccountWithRef,
  createContactListMachine,
} from '@app/contact-list-machine'
import {CSS, keyframes, styled} from '@app/stitches.config'
import {ObjectKeys} from '@app/utils/object-keys'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import * as HoverCard from '@radix-ui/react-hover-card'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {useMemo, useState} from 'react'
import toast from 'react-hot-toast'
import {InterpreterFrom} from 'xstate'
import '../styles/footer.scss'
import {Prompt} from './prompt'

export default function Footer() {
  let client = useQueryClient()
  let contactListService = useInterpret(() =>
    createContactListMachine({client}),
  )
  return (
    <div className="main-footer">
      <Contacts service={contactListService} />
      <ContactsPrompt refetch={() => contactListService.send('REFETCH')} />
    </div>
  )
}

function Contacts({
  service,
}: {
  service: InterpreterFrom<ReturnType<typeof createContactListMachine>>
}) {
  const totalCount = useSelector(service, (state) => state.context.all.length)
  const online = useSelector(service, (state) =>
    state.context.all.filter((acc) =>
      state.context.online.includes(acc.ref.id),
    ),
  )

  return (
    <HoverCard.Root openDelay={100}>
      <HoverCard.Trigger asChild>
        <button className="button">
          {online.length && <span className="status-indicator" />}
          <Icon name="Person" />
          <span>{`(${online.length}/${totalCount || 0})`}</span>
        </button>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        <HoverCard.Content side="top" align="end">
          <ul className="contacts-content">
            {online.map((contact) => (
              <ContactItem key={contact.id} contact={contact} />
            ))}
          </ul>
        </HoverCard.Content>
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}

type ContactsPromptProps = {
  refetch: () => void
  connect?: typeof apiConnect
}

export function ContactsPrompt({
  refetch,
  connect = apiConnect,
}: ContactsPromptProps) {
  const [peer, setPeer] = useState('')

  async function handleConnect() {
    if (peer) {
      try {
        // const connAttempt = await connect(peer.split(','))
        await toast.promise(connect(peer.trim().split(',')), {
          loading: 'Connecting to peer...',
          success: 'Connection Succeeded!',
          error: 'Connection Error',
        })
        refetch()
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
  zIndex: '$4',
  border: '1px solid $colors$base-border-normal',
  backgroundColor: '$base-background-normal',
  borderRadius: 6,
  padding: '$4',
  boxShadow: '$menu',
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

export type ContactItemProps = {
  contact: AccountWithRef
}

function ContactItem({contact}: ContactItemProps) {
  let [state] = useActor(contact.ref)

  let accountId = useMemo(
    () => contact.id.slice(contact.id.length - 8),
    [contact.id],
  )

  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        <li className="contact-item" data-testid={`contact-item-${accountId}`}>
          <Avatar
            size={1}
            alias={state.context.account.profile?.alias || 'C'}
          />
          <Text
            size="2"
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
        </li>
      </HoverCard.Trigger>
      <HoverCardContentStyled align="start" side="top">
        <Avatar size={2} alias={state.context.account.profile?.alias || ''} />
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
              key={index}
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

export var StyledItem = styled('li', {
  //   $$bg: 'transparent',
  //   $$bgHover: '$colors$base-component-bg-hover',
  //   $$foreground: '$colors$base-text-high',
  //   display: 'flex',
  //   minHeight: 28,
  //   gap: '1rem',
  //   alignItems: 'center',
  //   position: 'relative',
  //   borderRadius: '$1',
  //   backgroundColor: '$$bg',
  //   paddingHorizontal: '$2',
  //   '&:hover': {
  //     cursor: 'pointer',
  //     backgroundColor: '$$bgHover',
  //     '.dropdown': {
  //       opacity: 1,
  //     },
  //   },
  //   '.title': {
  //     userSelect: 'none',
  //     letterSpacing: '0.01em',
  //     lineHeight: '$2',
  //     textOverflow: 'ellipsis',
  //     whiteSpace: 'nowrap',
  //     overflow: 'hidden',
  //     color: '$$foreground',
  //     flex: 1,
  //     paddingHorizontal: '$3',
  //     paddingVertical: '$2',
  //   },
  //   '.dropdown': {
  //     opacity: 0,
  //   },
  // },
  // {
  //   defaultVariants: {
  //     active: false,
  //   },
  //   variants: {
  //     active: {
  //       true: {
  //         $$bg: '$colors$primary-normal',
  //         $$bgHover: '$colors$primary-active',
  //         $$foreground: '$colors$primary-text-opposite',
  //       },
  //     },
  //   },
})
