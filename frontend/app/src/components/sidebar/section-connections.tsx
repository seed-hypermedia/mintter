import {Account, connect, ConnectionStatus, getPeerInfo} from '@mintter/client'
import {Box} from '@mintter/ui/box'
import {Button} from '@mintter/ui/button'
import {Prompt} from '@mintter/ui/dialog'
import {keyframes, styled} from '@mintter/ui/stitches.config'
import {Text} from '@mintter/ui/text'
import {TextField} from '@mintter/ui/text-field'
import * as HoverCard from '@radix-ui/react-hover-card'
import {FormEvent, useState} from 'react'
import {ErrorBoundary} from 'react-error-boundary'
import toast from 'react-hot-toast'
import {useQuery} from 'react-query'
import {useListAccounts} from '../../hooks'
import {Section} from './section'
import {SectionError} from './section-error'
import {StyledSectionItem} from './section-item'

export function ConnectionsSection() {
  const {status, data = [], error} = useListAccounts()

  let title = `Connections (${data.length})`

  if (status == 'error') {
    console.error('Connections error: ', error)
    return <Text>ERROR</Text>
  }

  return (
    <Section title={title}>
      {!!data.length ? (
        <ErrorBoundary
          FallbackComponent={SectionError}
          onReset={() => {
            window.location.reload()
          }}
        >
          {data.map((c: Account) => (
            <AccountItem key={c.id} account={c} />
          ))}
        </ErrorBoundary>
      ) : null}
      <ConnectionsPrompt />
    </Section>
  )
}

function ConnectionsPrompt() {
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
      } catch (err: unknown) {
        console.error(err.message)
      }
    }
  }

  return (
    <Prompt.Root>
      <Prompt.Trigger variant="ghost" color="primary" size="1" css={{textAlign: 'left'}}>
        + add connection
      </Prompt.Trigger>
      <Prompt.Content>
        <Prompt.Title>Connect to Peer</Prompt.Title>
        <Prompt.Description>Enter a peer address to connect</Prompt.Description>
        <TextField
          value={peer}
          onChange={(event: FormEvent<HTMLInputElement>) => setPeer(event.currentTarget.value)}
          textarea
          rows={3}
          css={{
            minHeight: 150,
            maxHeight: 150,
            overflow: 'scroll',
          }}
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

/*
 * @todo context menu styles copied
 * @body This is copied from the context menu file
 */
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
  boxShadow: 'hsl(206 22% 7% / 35%) 0px 10px 38px -10px, hsl(206 22% 7% / 20%) 0px 10px 20px -15px',
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
  account: Account
}

function AccountItem({account}: AccountItemProps) {
  const {data} = useQuery(['ConnectionStatus', account.devices], () => {
    let devices = Object.values(account.devices)
    if (devices.length > 0) {
      return getPeerInfo(devices[0])
    }
  })

  return (
    <HoverCard.Root>
      <HoverCard.Trigger asChild>
        <StyledSectionItem color="default">
          {data && (
            <Box
              css={{
                width: 12,
                height: 12,
                borderRadius: '$round',
                flex: 'none',
                backgroundColor:
                  data.connectionStatus == ConnectionStatus.CONNECTED
                    ? '$success-default'
                    : data.connectionStatus == ConnectionStatus.NOT_CONNECTED
                    ? '$danger-default'
                    : '$background-default',
              }}
            />
          )}

          <Text size="2" data-testid="connection-alias">{`${account.profile?.alias} (${account.id.slice(-8)})`}</Text>
        </StyledSectionItem>
      </HoverCard.Trigger>
      <HoverCardContentStyled align="start" portalled>
        <Box css={{display: 'flex', flexDirection: 'column', gap: '$2'}}>
          <Box css={{width: 32, height: 32, backgroundColor: '$background-neutral', borderRadius: '$round'}} />
          <Box>
            <Text fontWeight="bold">{account.profile?.alias}</Text>
            <Text
              color="muted"
              css={{
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {account.profile?.bio}
            </Text>
            <Text size="1" css={{marginTop: '$3'}}>
              {account.profile?.email}
            </Text>
            <Text
              size="1"
              css={{
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              <b>Acc. ID:</b> {account.id}
            </Text>
            <Text
              size="1"
              css={{
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              <b>device ID:</b> {Object.keys(account.devices)[0]}
            </Text>
          </Box>
        </Box>
      </HoverCardContentStyled>
    </HoverCard.Root>
  )
}
