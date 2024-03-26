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
  BlockQuote,
  Button,
  ChevronDown,
  Heading,
  ListItem,
  Popover,
  SizableText,
  Tooltip,
  XStack,
  YGroup,
  YStack,
  copyTextToClipboard,
  toast,
} from '@mintter/ui'
import {PageContainer} from '@mintter/ui/src/container'
import {ArrowUpRight, Pencil, X} from '@tamagui/lucide-icons'
import {ReactNode} from 'react'
import {AccessoryLayout} from '../components/accessory-sidebar'
import {AccountTrustButton} from '../components/account-trust'
import {EntityCitationsAccessory} from '../components/citations'
import {useCopyGatewayReference} from '../components/copy-gateway-reference'
import {MenuItem} from '../components/dropdown'
import {EditDocButton} from '../components/edit-doc-button'
import {useEditProfileDialog} from '../components/edit-profile-dialog'
import {FooterButton} from '../components/footer'
import {MainWrapper} from '../components/main-wrapper'
import {OptionsDropdown} from '../components/options-dropdown'
import {PinAccountButton} from '../components/pin-entity'
import {CopyReferenceButton} from '../components/titlebar-common'
import {useMyAccount} from '../models/accounts'
import {useEntityMentions} from '../models/content-graph'
import {usePublication} from '../models/documents'
import {getAvatarUrl} from '../utils/account-url'
import {useOpenDraft} from '../utils/open-draft'
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
  const editProfileDialog = useEditProfileDialog()
  return (
    <PageContainer marginVertical="$6">
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
          <CopyReferenceButton />
          {isMe ? null : <PinAccountButton accountId={accountId} />}
          {isMe ? (
            <Button
              size="$2"
              icon={Pencil}
              onPress={() => {
                editProfileDialog.open(true)
              }}
            >
              Edit Profile
            </Button>
          ) : null}
          <Popover placement="bottom-end">
            <Popover.Trigger asChild>
              <Button
                icon={isMe ? null : <OnlineIndicator online={isConnected} />}
                iconAfter={ChevronDown}
                size="$2"
              >
                {isMe ? 'My Devices' : isConnected ? 'Connected' : 'Offline'}
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
      <Section>
        <SizableText size="$4">{account.profile?.bio}</SizableText>
      </Section>
      <YStack gap="$4" marginVertical="$4">
        {account.profile?.rootDocument ? (
          <ProfileDoc
            docId={account.profile.rootDocument}
            profileAlias={account.profile?.alias}
            accountId={accountId}
          />
        ) : (
          <CreateProfileDocument accountId={accountId} />
        )}
      </YStack>
      {editProfileDialog.content}
    </PageContainer>
  )
}

function CreateProfileDocument({accountId}: {accountId: string}) {
  const myAccount = useMyAccount()
  const isMyAccount = myAccount.data?.id === accountId
  const openDraft = useOpenDraft('push')
  if (!isMyAccount) return null
  return (
    <XStack gap="$4">
      <Button
        size="$2"
        icon={Pencil}
        onPress={() => {
          openDraft(undefined, {isProfileDocument: true})
        }}
      >
        Create Profile Document
      </Button>
    </XStack>
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
  const groupRoute = route.key === 'group' ? route : undefined
  const pub = usePublication({
    id: docId,
  })
  return pub.status == 'success' && pub.data ? (
    <YStack
      width="100%"
      maxWidth="calc(90ch + 20vw)"
      paddingHorizontal="$5"
      alignSelf="center"
    >
      <XStack gap="$2" jc="flex-end" ai="center">
        <EditDocButton
          // variants={[
          //   {
          //     key: 'group',
          //     groupId,
          //     pathName: '/',
          //   },
          // ]}
          docId={docId}
          baseVersion={undefined}
          navMode="push"
        />
        <Tooltip content="Open in New Window">
          <Button
            icon={ArrowUpRight}
            size="$2"
            onPress={() => {
              spawn({
                key: 'publication',
                documentId: docId,
                variants: [
                  {
                    key: 'author',
                    author: accountId,
                  },
                ],
              })
            }}
          />
        </Tooltip>
        <OptionsDropdown
          menuItems={[
            ...(isMyAccount
              ? [
                  {
                    key: 'remove',
                    icon: X,
                    label: 'Remove Publication Document',
                    onPress: () => {},
                  },
                ]
              : []),
          ]}
        />
      </XStack>
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
        routeParams={{blockRef: groupRoute?.blockId}}
      >
        <PublicationContent publication={pub.data} />
      </AppPublicationContentProvider>
    </YStack>
  ) : null
}
