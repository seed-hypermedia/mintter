import {networkingClient} from '@app/api-clients'
import {AccountWithRef} from '@app/contact-list-machine'
import {useConnectionSummary} from '@app/hooks/contacts'
import {useDaemonReady, useOnline} from '@app/node-status-context'
import {keyframes, styled} from '@app/stitches.config'
import {useNavigate, useNavRoute} from '@app/utils/navigation'
import {TextField} from '@components/text-field'
import {
  Add,
  Button,
  ButtonProps,
  Clock,
  Delete,
  FooterWrapper,
  SizableText,
  User,
  XStack,
} from '@mintter/ui'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as HoverCard from '@radix-ui/react-hover-card'
import {ReactNode, useState} from 'react'
import toast from 'react-hot-toast'
import {OnlineIndicator} from './indicator'
import {Prompt} from './prompt'

export function FooterButton({
  active,
  label,
  icon,
  onPress,
}: {
  active?: boolean
  label: string
  icon?: ButtonProps['icon']
  onPress: () => void
}) {
  return (
    <Button
      size="$1"
      chromeless={!active}
      color={active ? '$blue10' : undefined}
      onPress={onPress}
      icon={icon}
      paddingHorizontal="$2"
    >
      {label}
    </Button>
  )
}

function FooterContactsButton() {
  const route = useNavRoute()
  const navigate = useNavigate()
  const summary = useConnectionSummary()
  return (
    <XStack alignItems="center" theme="blue" gap="$2">
      <Button
        size="$1"
        chromeless={route.key != 'connections'}
        color={route.key == 'connections' ? '$blue10' : undefined}
        onPress={() => {
          navigate({key: 'connections'})
        }}
        paddingHorizontal="$2"
      >
        <OnlineIndicator online={summary.online} />
        <User size={12} />
        <SizableText size="$1" color="$color">
          {summary.connectedCount}
        </SizableText>
      </Button>
    </XStack>
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
    <FooterWrapper>
      {!isDaemonReady ? (
        <XStack alignItems="center">
          <Clock size={10} />
          <SizableText size="$1" userSelect="none">
            Initializing node...
          </SizableText>
        </XStack>
      ) : !isOnline ? (
        <XStack alignItems="center">
          <Delete size={12} />
          <SizableText size="$1" userSelect="none">
            You are Offline
          </SizableText>
        </XStack>
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

      <XStack
        flex={1}
        alignItems="center"
        justifyContent="flex-end"
        marginRight="$2"
      >
        {children}
      </XStack>
    </FooterWrapper>
  )
}

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
        <Button data-testid="add-contact-button">
          <Add size={12} />
        </Button>
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
                size="$2"
                onPress={handleConnect}
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
