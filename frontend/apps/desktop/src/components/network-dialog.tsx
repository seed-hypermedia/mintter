import {useOpenUrl} from '@/open-url'
import {Account, API_FILE_URL, PeerInfo} from '@shm/shared'
import {
  ArrowUpRight,
  Button,
  ButtonText,
  Copy,
  copyTextToClipboard,
  Dialog,
  ExternalLink,
  List,
  SizableText,
  Spinner,
  toast,
  Tooltip,
  UIAvatar,
  View,
  XGroup,
  XStack,
  YStack,
} from '@shm/ui'
import React, {useState} from 'react'
import {ColorValue} from 'react-native'
import {useAllAccounts} from '../models/accounts'
import {
  useIsGatewayConnected,
  useIsOnline,
  usePeers,
} from '../models/networking'
import {hostnameStripProtocol} from '../utils/site-hostname'
import {useNavigate} from '../utils/useNavigate'
import {useAppDialog} from './dialog'
import {OptionsDropdown} from './options-dropdown'

export function useNetworkDialog() {
  return useAppDialog<true>(NetworkDialog)
}

export function NetworkDialog() {
  const contacts = useAllAccounts()
  const peers = usePeers(false, {
    refetchInterval: 20_000,
  })
  const accounts = Object.fromEntries(
    contacts.data?.accounts.map((account) => [account.id, account]) || [],
  )
  const connectedAccountIds = new Set(
    peers.data
      ?.filter((peer) => peer.connectionStatus === 1)
      .map((peer) => peer.accountId) || [],
  )
  const peerCount = peers.data?.length || 0
  const connectedAccounts =
    contacts.data?.accounts.filter((account) => {
      return connectedAccountIds.has(account.id)
    }) || []
  const siteAccounts = connectedAccounts.filter(
    (account) =>
      account.profile?.bio === 'Hypermedia Site. Powered by Mintter.',
  )
  const userAccountCount = connectedAccounts.length - siteAccounts.length
  const siteAccountCount = siteAccounts.length
  const isOnline = useIsOnline()
  const [peerFilter, setPeerFilter] = useState<'all' | 'accounts' | 'sites'>(
    'all',
  )
  const filteredPeers = peers.data?.filter((peer) => {
    if (peerFilter === 'all') return true
    const account: Account | undefined = accounts[peer.accountId]
    const isSite =
      account?.profile?.bio === 'Hypermedia Site. Powered by Mintter.'
    if (peerFilter === 'accounts' && !isSite) return true
    if (peerFilter === 'sites' && isSite) return true
    return false // not sure if this will ever happen
  })
  const displayPeers = filteredPeers?.sort(
    (a, b) => b.connectionStatus - a.connectionStatus,
  )
  return (
    <>
      <Dialog.Title>Network Connections</Dialog.Title>
      <XStack>
        <IndicationTag
          label={isOnline ? 'Device Online' : 'Device Offline'}
          status={isOnline ? 2 : 1}
        />
        {isOnline ? <GatewayIndicationTag /> : null}
      </XStack>
      <XGroup size="$2">
        <XGroup.Item>
          <Button
            size="$2"
            backgroundColor={peerFilter === 'all' ? '$color6' : undefined}
            onPress={() => setPeerFilter('all')}
          >
            {String(peerCount)} Known Peers
          </Button>
        </XGroup.Item>
        <XGroup.Item>
          <Button
            size="$2"
            backgroundColor={peerFilter === 'accounts' ? '$color6' : undefined}
            onPress={() => setPeerFilter('accounts')}
          >
            {String(userAccountCount)} Connected Accounts
          </Button>
        </XGroup.Item>
        <XGroup.Item>
          <Button
            size="$2"
            backgroundColor={peerFilter === 'sites' ? '$color6' : undefined}
            onPress={() => setPeerFilter('sites')}
          >
            {String(siteAccountCount)} Connected Sites
          </Button>
        </XGroup.Item>
      </XGroup>
      <View flexDirection="column" minHeight={500}>
        <List
          items={displayPeers || []}
          renderItem={({item: peer, containerWidth}) => {
            return (
              <PeerRow
                key={peer.id}
                peer={peer}
                account={accounts[peer.accountId]}
              />
            )
          }}
        />
      </View>
    </>
  )
}

const PeerRow = React.memo(function PeerRow({
  peer,
  account,
}: {
  peer: PeerInfo
  account?: Account
}) {
  const {id, addrs, connectionStatus} = peer
  const isSite =
    account?.profile?.bio === 'Hypermedia Site. Powered by Mintter.'
  const label = isSite
    ? hostnameStripProtocol(account?.profile?.alias)
    : account?.profile?.alias || 'Unknown Account'
  const spawn = useNavigate('spawn')
  const openUrl = useOpenUrl()
  function handlePress() {
    if (isSite && account?.profile?.alias) openUrl(account?.profile?.alias)
    else if (!isSite && account?.id)
      spawn({key: 'account', accountId: account.id})
    else toast.error('Could not open account')
  }
  function handleCopyPeerId() {
    copyTextToClipboard(id)
    toast.success('Copied Peer ID')
  }
  if (!account) return null
  return (
    <XStack
      jc="space-between"
      f={1}
      p="$2"
      minHeight={'$2'}
      ai="center"
      group="item"
    >
      <XStack gap="$2" ai="center">
        <Tooltip content={connectionStatus ? 'Connected' : 'Disconnected'}>
          <XStack
            backgroundColor={connectionStatus ? '$green10' : '$gray8'}
            borderRadius={6}
            height={12}
            width={12}
            space="$4"
          />
        </Tooltip>
        <Tooltip content="Copy Peer ID">
          <ButtonText onPress={handleCopyPeerId}>
            {id.substring(id.length - 10)}
          </ButtonText>
        </Tooltip>
      </XStack>
      <XStack gap="$3" marginHorizontal="$3">
        <XStack gap="$2">
          {account && !isSite ? (
            <UIAvatar
              size={20}
              onPress={handlePress}
              label={account.profile?.alias}
              url={
                account.profile?.avatar &&
                `${API_FILE_URL}/${account.profile?.avatar}`
              }
            />
          ) : null}
          <ButtonText
            color={isSite ? '$blue10' : '$gray10'}
            hoverStyle={{
              textDecorationLine: isSite ? 'underline' : 'none',
            }}
            onPress={handlePress}
          >
            {label}
          </ButtonText>
        </XStack>
        <OptionsDropdown
          hiddenUntilItemHover
          menuItems={[
            {
              key: 'open',
              icon: isSite ? ExternalLink : ArrowUpRight,
              label: isSite ? 'Open Site' : 'Open Account',
              onPress: handlePress,
            },
            {
              key: 'copy',
              icon: Copy,
              label: 'Copy Peer ID',
              onPress: handleCopyPeerId,
            },
            {
              key: 'copyAddress',
              icon: Copy,
              label: 'Copy Addresses',
              onPress: () => {
                copyTextToClipboard(addrs.join(','))
                toast.success('Copied Peer Addresses')
              },
            },
          ]}
        />
      </XStack>
    </XStack>
  )
})

function IndicationStatus({color}: {color: ColorValue}) {
  return (
    <XStack
      backgroundColor={color}
      borderRadius={6}
      height={12}
      width={12}
      space="$4"
    />
  )
}

function IndicationTag({
  label,
  status,
}: {
  label: string
  status: null | 0 | 1 | 2
}) {
  let statusDot = <Spinner />
  if (status === 0) statusDot = <IndicationStatus color="$red9" />
  if (status === 1) statusDot = <IndicationStatus color="$orange9" />
  if (status === 2) statusDot = <IndicationStatus color="$green9" />
  return (
    <Button disabled size="$2">
      {statusDot}
      {label}
    </Button>
  )
}

function GatewayIndicationTag() {
  const gatewayStatus = useIsGatewayConnected()
  let label = 'Gateway'
  if (gatewayStatus === 0) label = 'Gateway Internal Error'
  if (gatewayStatus === 1) label = 'Gateway Unreachable'
  if (gatewayStatus === 2) label = 'Gateway Online'
  return <IndicationTag label={label} status={gatewayStatus} />
}

function NumberBlurb({
  value,
  label,
  backgroundColor,
}: {
  value: number
  label: string
  backgroundColor?: ColorValue
}) {
  return (
    <YStack
      space="$4"
      padding="$2"
      borderRadius="$4"
      ai="center"
      backgroundColor={backgroundColor || '$color4'}
    >
      <SizableText size="$2">{label}</SizableText>
      <SizableText size="$7" fontWeight="bold">
        {value}
      </SizableText>
    </YStack>
  )
}
