import {Avatar} from '@mintter/app/components/avatar'
import Footer from '@mintter/app/components/footer'
import {OnlineIndicator} from '@mintter/app/components/indicator'
import {useAccountWithDevices} from '@mintter/app/models/contacts'
import {useAccountGroups} from '@mintter/app/models/groups'
import {useNavRoute} from '@mintter/app/utils/navigation'
import {
  Profile,
  PublicationContent,
  abbreviateCid,
  createHmId,
  pluralS,
  pluralizer,
} from '@mintter/shared'
import {
  AlertDialog,
  BlockQuote,
  Button,
  ChevronDown,
  Heading,
  ListItem,
  MenuItem,
  Popover,
  SizableText,
  Spinner,
  XStack,
  YGroup,
  YStack,
  copyTextToClipboard,
  toast,
} from '@mintter/ui'
import {PageContainer} from '@mintter/ui/src/container'
import {ReactNode} from 'react'
import {AccessoryLayout} from '../components/accessory-sidebar'
import {AccountTrustButton} from '../components/account-trust'
import {EntityCitationsAccessory} from '../components/citations'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {FavoriteButton} from '../components/favoriting'
import {FooterButton} from '../components/footer'
import {MainWrapper} from '../components/main-wrapper'
import {CopyReferenceButton} from '../components/titlebar-common'
import {useMyAccount, useSetProfile} from '../models/accounts'
import {useEntityMentions} from '../models/content-graph'
import {usePublication} from '../models/documents'
import {getAvatarUrl} from '../utils/account-url'
import {useNavigate} from '../utils/useNavigate'
import {AppPublicationContentProvider} from './publication-content-provider'

function DeviceRow({
  isOnline,
  deviceId,
}: {
  isOnline: boolean
  deviceId: string
}) {
  return (
    <YGroup.Item>
      <ListItem
        onPress={() => {
          copyTextToClipboard(deviceId)
          toast.success('Copied Device ID to clipboard')
        }}
      >
        <OnlineIndicator online={isOnline} />
        {abbreviateCid(deviceId)}
      </ListItem>
    </YGroup.Item>
  )
}

function Section({children}: {children: ReactNode}) {
  return (
    <YStack
      borderBottomWidth={1}
      borderBottomColor="black"
      borderColor="$gray6"
      paddingVertical="$4"
      space
    >
      {children}
    </YStack>
  )
}

export function getAccountName(profile: Profile | undefined) {
  if (!profile) return ''
  return profile.alias || 'Untitled Account'
}

export default function AccountPage() {
  const route = useNavRoute()
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const accessoryKey = route.accessory?.key
  const replace = useNavigate('replace')
  const accountEntityId = createHmId('a', accountId)
  const mentions = useEntityMentions(accountEntityId)
  const [copyDialogContent, onCopy] = useCopyGatewayReference()
  let accessory: ReactNode = null
  if (accessoryKey === 'citations') {
    accessory = <EntityCitationsAccessory entityId={accountEntityId} />
  }
  return (
    <>
      <AccessoryLayout accessory={accessory}>
        <MainWrapper>
          <MainAccountPage />
        </MainWrapper>
      </AccessoryLayout>
      {copyDialogContent}
      <Footer>
        {mentions.data?.mentions?.length ? (
          <FooterButton
            active={accessoryKey === 'citations'}
            label={`${mentions.data?.mentions?.length} ${pluralS(
              mentions.data?.mentions?.length,
              'Citation',
            )}`}
            icon={BlockQuote}
            onPress={() => {
              if (route.accessory?.key === 'citations')
                return replace({...route, accessory: null})
              replace({...route, accessory: {key: 'citations'}})
            }}
          />
        ) : null}
      </Footer>
    </>
  )
}

function MainAccountPage() {
  const route = useNavRoute()
  const nav = useNavigate('push')
  const accountId = route.key === 'account' && route.accountId
  if (!accountId) throw new Error('Invalid route, no account id')
  const account = useAccountWithDevices(accountId)
  const {data: groups} = useAccountGroups(accountId)
  const myAccount = useMyAccount()
  const connectedCount = account.devices?.filter((device) => device.isConnected)
    .length
  const isConnected = !!connectedCount
  const isMe = myAccount.data?.id === accountId
  const accountEntityUrl = createHmId('a', accountId)
  return (
    <>
      <PageContainer marginTop="$6">
        <Section>
          <XStack gap="$4" alignItems="center" justifyContent="space-between">
            <XStack gap="$4" alignItems="center">
              <Avatar
                id={accountId}
                size={60}
                label={account.profile?.alias}
                url={getAvatarUrl(account.profile?.avatar)}
              />

              <SizableText
                whiteSpace="nowrap"
                overflow="hidden"
                textOverflow="ellipsis"
                size="$5"
                fontWeight="700"
              >
                {getAccountName(account.profile)}
              </SizableText>
            </XStack>

            <XStack space="$2">
              {isMe ? null : <FavoriteButton url={accountEntityUrl} />}
              <CopyReferenceButton />
              <Popover placement="bottom-end">
                <Popover.Trigger asChild>
                  <Button
                    icon={
                      isMe ? null : <OnlineIndicator online={isConnected} />
                    }
                    iconAfter={ChevronDown}
                    size="$2"
                  >
                    {isMe
                      ? 'My Devices'
                      : isConnected
                      ? 'Connected'
                      : 'Offline'}
                  </Button>
                </Popover.Trigger>
                <Popover.Content
                  padding={0}
                  elevation="$2"
                  enterStyle={{y: -10, opacity: 0}}
                  exitStyle={{y: -10, opacity: 0}}
                  elevate
                  animation={[
                    'fast',
                    {
                      opacity: {
                        overshootClamping: true,
                      },
                    },
                  ]}
                >
                  <YGroup>
                    <YGroup.Item>
                      <XStack paddingHorizontal="$4">
                        <MenuItem
                          disabled
                          title={pluralizer(account.devices.length, 'Device')}
                          size="$1"
                          fontWeight="700"
                        />
                      </XStack>
                    </YGroup.Item>
                    {account.devices.map((device) => {
                      if (!device) return null
                      return (
                        <DeviceRow
                          key={device.deviceId}
                          isOnline={device.isConnected}
                          deviceId={device.deviceId}
                        />
                      )
                    })}
                  </YGroup>
                </Popover.Content>
              </Popover>

              {isMe ? null : (
                <AccountTrustButton
                  accountId={accountId}
                  isTrusted={account.isTrusted}
                />
              )}
            </XStack>
          </XStack>
        </Section>
      </PageContainer>
      {account.profile?.rootDocument ? (
        <ProfileDoc
          docId={account.profile.rootDocument}
          profileAlias={account.profile?.alias}
          accountId={accountId}
        />
      ) : (
        <PageContainer marginTop="$6">
          <SizableText size="$4" fontFamily="$editorBody" marginTop="$5">
            {account.profile?.bio}
          </SizableText>
        </PageContainer>
      )}
    </>
  )
}

function ProfileDoc({
  docId,
  profileAlias,
  accountId,
}: {
  docId: string
  profileAlias: string
  accountId: string
}) {
  const route = useNavRoute()
  const myAccount = useMyAccount()
  const isMyAccount = myAccount.data?.id === accountId
  const spawn = useNavigate('spawn')
  const accountRoute = route.key === 'account' ? route : undefined
  const pub = usePublication({
    id: docId,
  })
  return pub.status == 'success' && pub.data ? (
    <PageContainer>
      {pub.data?.document?.title &&
      profileAlias !== pub.data?.document?.title ? (
        <Heading
          size="$1"
          fontSize={'$2'}
          paddingHorizontal="$5"
          $gtMd={{
            paddingHorizontal: '$6',
          }}
        >
          {pub.data?.document?.title}
        </Heading>
      ) : null}
      <AppPublicationContentProvider
        routeParams={{blockRef: accountRoute?.blockId}}
      >
        <PublicationContent publication={pub.data} />
      </AppPublicationContentProvider>
    </PageContainer>
  ) : null
}

export function RemoveProfileDocDialog({
  onClose,
  input,
}: {
  onClose: () => void
  input: {}
}) {
  const setProfile = useSetProfile({
    onSuccess: onClose,
  })
  return (
    <YStack space backgroundColor="$background" padding="$4" borderRadius="$3">
      <AlertDialog.Title>Remove Profile Document</AlertDialog.Title>
      <AlertDialog.Description>
        Unlink this document from your profile? This will remove all your
        profile's organization.
      </AlertDialog.Description>
      <Spinner opacity={setProfile.isLoading ? 1 : 0} />
      <XStack space="$3" justifyContent="flex-end">
        <AlertDialog.Cancel asChild>
          <Button
            onPress={() => {
              onClose()
            }}
            chromeless
          >
            Cancel
          </Button>
        </AlertDialog.Cancel>
        <AlertDialog.Action asChild>
          <Button
            theme="red"
            onPress={() => {
              setProfile.mutate({
                rootDocument: '',
              })
              onClose()
            }}
          >
            Remove
          </Button>
        </AlertDialog.Action>
      </XStack>
    </YStack>
  )
}
