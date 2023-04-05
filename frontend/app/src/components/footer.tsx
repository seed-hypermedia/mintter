import {networkingClient} from '@app/api-clients'
import {AccountWithRef, contactsListMachine} from '@app/contact-list-machine'
import {useConnectionSummary} from '@app/hooks/contacts'
import {useDaemonReady, useOnline} from '@app/node-status-context'
import {keyframes, styled} from '@app/stitches.config'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {ObjectKeys} from '@app/utils/object-keys'
import {Avatar} from '@components/avatar'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {ConnectionStatus} from '@mintter/shared'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as HoverCard from '@radix-ui/react-hover-card'
import {useActor} from '@xstate/react'
import {ReactNode, useMemo, useState} from 'react'
import toast from 'react-hot-toast'
import {InterpreterFrom} from 'xstate'
import {OnlineIndicator} from './indicator'
import {Prompt} from './prompt'

const LabelWrap = styled('div', {
  marginHorizontal: 6,
})

export function FooterButton({
  active,
  label,
  icon,
  onClick,
}: {
  active?: boolean
  label: string
  icon?: ReactNode
  onClick: () => void
}) {
  return (
    <Button
      size="1"
      variant="ghost"
      color={active ? 'primary' : 'muted'}
      onClick={onClick}
      css={{
        display: 'flex',
      }}
    >
      {icon}
      <LabelWrap>{label}</LabelWrap>
    </Button>
  )
}

function FooterContactsButton() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const summary = useConnectionSummary()
  return (
    <Button
      size="1"
      variant="ghost"
      color={route.key === 'connections' ? 'primary' : 'muted'}
      onClick={() => {
        navigate({key: 'connections'})
      }}
      css={{
        display: 'flex',
        gap: '$2',
      }}
    >
      <OnlineIndicator online={summary.online} />
      <Icon name="Person" size="1" />
      <Text css={{}}>{summary.connectedCount}</Text>
    </Button>
  )
}

export default function Footer({children}: {children?: ReactNode}) {
  let isDaemonReady = useDaemonReady()
  let isOnline = useOnline()

  // let contactsListQuery = useQuery({
  //   enabled: isDaemonReady,
  //   queryKey: [queryKeys.GET_CONTACTS_LIST],
  //   queryFn: () => accountsClient.listAccounts({}),
  // })

  // let contactListService = useInterpret(() => contactsListMachine, {
  //   actions: {
  //     triggerRefetch: () => {
  //       contactsListQuery.refetch()
  //     },
  //     assignErrorMessage: assign({
  //       errorMessage: (_, event) => event.errorMessage,
  //     }),
  //   },
  // })

  // if (contactsListQuery.status == 'error') {
  //   contactListService.send({
  //     type: 'CONTACTS.LIST.ERROR',
  //     errorMessage: JSON.stringify(contactsListQuery.error),
  //   })
  //   return <div className="main-footer">{children}</div>
  // }

  return (
    <FooterStyled platform={import.meta.env.TAURI_PLATFORM}>
      {!isDaemonReady ? (
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            paddingInline: '$4',
            paddingBlock: '$1',
            gap: '$2',
            userSelect: 'none',
            marginRight: '$4',
            '&:hover': {
              cursor: 'default',
            },
          }}
        >
          <Icon name="Clock" size="1" color="muted" />
          <Text
            color="muted"
            size="1"
            css={{
              userSelect: 'none',
            }}
          >
            Initializing node...
          </Text>
        </Box>
      ) : !isOnline ? (
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            paddingInline: '$4',
            paddingBlock: '$1',
            gap: '$2',
            userSelect: 'none',
            backgroundColor: '$danger-normal',
            marginRight: '$4',
            '&:hover': {
              cursor: 'default',
            },
          }}
        >
          <Icon name="Close" size="1" color="danger-opposite" />
          <Text
            color="danger-opposite"
            size="1"
            css={{
              userSelect: 'none',
            }}
          >
            You are Offline
          </Text>
        </Box>
      ) : null}
      {/* {isDaemonReady ? (
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            gap: '0',
          }}
        >
          <ContactsPrompt refetch={() => contactListService.send('REFETCH')} />
          <Contacts service={contactListService} />
        </Box>
      ) : null} */}
      <FooterContactsButton />

      <Box
        css={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'flex-end',
        }}
      >
        {children}
      </Box>
    </FooterStyled>
  )
}

function Contacts({
  service,
}: {
  service: InterpreterFrom<typeof contactsListMachine>
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
        <ButtonStyled>
          {online.length ? (
            <Box
              css={{
                width: 7,
                height: 7,
                borderRadius: '$round',
                backgroundColor: '$success-active',
              }}
            />
          ) : null}
          <Icon name="Person" />
          <span>{`(${online.length}/${totalCount || 0})`}</span>
        </ButtonStyled>
      </HoverCard.Trigger>
      <HoverCard.Portal>
        {online.length && (
          <HoverCard.Content side="top" align="end">
            <ContactsContent>
              {online.map((contact) => (
                <ContactItem key={contact.id} contact={contact} />
              ))}
            </ContactsContent>
          </HoverCard.Content>
        )}
      </HoverCard.Portal>
    </HoverCard.Root>
  )
}

var ContactsContent = styled('ul', {
  backgroundColor: '$base-background-normal',
  padding: '$2',
  boxShadow: '$menu',
  margin: 0,
  listStyle: 'none',
})

type ContactsPromptProps = {
  refetch: () => void
  connect?: typeof networkingClient.connect
}

export function ContactsPrompt({
  refetch,
  connect = networkingClient.connect,
}: ContactsPromptProps) {
  const [peer, setPeer] = useState('')

  async function handleConnect() {
    if (peer) {
      try {
        await toast.promise(connect({addrs: peer.trim().split(',')}), {
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
      <DialogPrimitive.Trigger asChild>
        <ButtonStyled data-testid="add-contact-button" css={{paddingInline: 0}}>
          <Icon name="Add" color="muted" />
        </ButtonStyled>
      </DialogPrimitive.Trigger>
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
  zIndex: '$max',
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
        <Box
          as="li"
          data-testid={`contact-item-${accountId}`}
          css={{
            display: 'flex',
            alignItems: 'center',
            minWidth: '20ch',
            paddingBlock: '$2',
            paddingInline: '$4',
            userSelect: 'none',
            borderRadius: '$2',
            whiteSpace: 'nowrap',
            gap: '$2',
            '&:hover': {
              backgroundColor: '$base-component-bg-hover',
            },
          }}
        >
          <Avatar
            accountId={state.context.account.id}
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
        </Box>
      </HoverCard.Trigger>
      <HoverCardContentStyled align="start" side="top">
        <Avatar
          accountId={state.context.account.id}
          size={2}
          alias={state.context.account.profile?.alias || ''}
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

var FooterStyled = styled(Box, {
  position: 'fixed',
  height: 'var(--footer-h)',
  borderTop: '1px solid $colors$base-border-subtle',
  backgroundColor: '$base-background-subtle',
  display: 'flex',
  alignItems: 'stretch',
  paddingInline: '$2',
  inset: import.meta.env.TAURI_PLATFORM == 'macos' ? 'auto 0 0 0' : 'unset',
  variants: {
    platform: {
      macos: {
        inset: 'auto 0 0 0',
      },
      windows: {
        bottom: 1,
        left: 1,
        right: 1,
      },
      linux: {
        bottom: 1,
        left: 1,
        right: 1,
      },
    },
  },
})

var ButtonStyled = styled('button', {
  $$color: '$colors$base-text-low',
  '$$color-hover': '$colors$base-text-low',
  $$surface: 'transparent',
  '$$surface-hover': '$base-component-bg-hover',
  all: 'unset',
  minInliseSize: '1em',
  minBlockSize: '1em',
  paddingBlock: '$1',
  paddingInline: '$2',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  borderRadius: '$2',
  gap: '$2',
  fontSize: '$1',
  backgroundColor: '$$surface',
  color: '$$color',
  border: '1px solid transparent',
  '&:hover': {
    backgroundColor: '$base-component-bg-hover',
    color: '$$color-hover',
    cursor: 'pointer',
  },
  '& > *': {
    maxHeight: '1em',
    lineHeight: 1,
  },
  variants: {
    variant: {
      primary: {
        $$color: '$colors$primary-active',
        '$$color-hover': 'white',
        '$$surface-hover': '$colors$primary-active',
      },
      success: {
        $$color: '$colors$success-active',
        '$$color-hover': 'white',
        '$$surface-hover': '$colors$success-active',
      },
    },
    type: {
      outlined: {
        borderColor: '$$color',
      },
      dropdown: {
        fontWeight: '$bold',
      },
    },
  },
})
