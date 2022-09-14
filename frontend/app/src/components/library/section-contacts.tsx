import {
  Account,
  connect as apiConnect,
  ConnectionStatus,
  listAccounts,
  ListAccountsResponse,
} from '@app/client'
import {queryKeys} from '@app/hooks'
import {CSS, keyframes, styled} from '@app/stitches.config'
import {error} from '@app/utils/logger'
import {ObjectKeys} from '@app/utils/object-keys'
import {Icon} from '@components/icon'
import {createContactMachine} from '@components/library/contact-machine'
import {StyledItem} from '@components/library/library-item'
import {Placeholder} from '@components/placeholder-box'
import * as HoverCard from '@radix-ui/react-hover-card'
import {useMachine} from '@xstate/react'
import {useMemo, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {useQuery} from 'react-query'
import {Box} from '../box'
import {Button} from '../button'
import {Prompt} from '../prompt'
import {Text} from '../text'
import {TextField} from '../text-field'
import {Section} from './section'
import './section-contacts.scss'
import {SectionError} from './section-error'

/**
 *
 * Contacts Section
 * - fetch the contacts list
 * - create a machine for each contact
 */

function ContactListLoading() {
  return (
    <>
      <Placeholder css={{height: 20, width: '90%'}} />
      <Placeholder css={{height: 20, width: '$full'}} />
      <Placeholder css={{height: 20, width: '85%'}} />
    </>
  )
}

export function ContactsSection() {
  const {status, data, refetch} = useContacts()
  let title = `Contacts (${data?.accounts?.length || 0})`

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
          <ContactsPrompt refetch={refetch} />
        </Box>
      }
    >
      <ErrorBoundary
        FallbackComponent={SectionError}
        onReset={() => {
          window.location.reload()
        }}
      >
        {status == 'loading' || status == 'idle' ? (
          <ContactListLoading />
        ) : status == 'error' ? (
          <Text color="danger">Contact List error</Text>
        ) : data.accounts?.length == 0 ? (
          <Text>NO Accounts</Text>
        ) : (
          data.accounts?.map((contact) => (
            <ContactItem key={contact.id} contact={contact} />
          ))
        )}
      </ErrorBoundary>
    </Section>
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
        await toast.promise(connect(peer.split(',')), {
          loading: 'Connecting to peer...',
          success: 'Connection Succeeded!',
          error: 'Connection Error',
        })
        refetch()
      } catch (err) {
        error('Connect Error:', err.message)
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
        <Icon name="Add" color="muted" size="1" />
      </Prompt.Trigger>
      <Prompt.Content>
        <Prompt.Title>Connect to Peer</Prompt.Title>
        <Prompt.Description>Enter a peer address to connect</Prompt.Description>
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
  contact: Account
}

function ContactItem({contact}: ContactItemProps) {
  let [state] = useMachine(() => createContactMachine(contact))

  let accountId = useMemo(
    () => contact.id.slice(contact.id.length - 8),
    [contact.id],
  )

  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        <StyledItem
          data-testid={`contact-item-${accountId}`}
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
      <HoverCardContentStyled align="start" portalled side="top">
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

function useContacts() {
  return useQuery<any, any, ListAccountsResponse>(
    [queryKeys.GET_CONTACTS_LIST],
    () => listAccounts,
  )
}
