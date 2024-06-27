import { useIPC } from '@/app-context'
import { AvatarForm } from '@/components/avatar-form'
import { useEditProfileDialog } from '@/components/edit-profile-dialog'
import appError from '@/errors'
import { useMyAccount_deprecated } from '@/models/accounts'
import { useAutoUpdatePreference } from '@/models/app-settings'
import { useDaemonInfo, useDeleteKey, useSavedMnemonics } from '@/models/daemon'
import { useExperiments, useWriteExperiments } from '@/models/experiments'
import {
  useGatewayUrl,
  usePushOnCopy,
  usePushOnPublish,
  useSetGatewayUrl,
  useSetPushOnCopy,
  useSetPushOnPublish,
} from '@/models/gateway-settings'
import { usePeerInfo } from '@/models/networking'
import {
  useExportWallet,
  useInvoicesBywallet,
  useWallets,
} from '@/models/payments'
import { useWalletOptIn } from '@/models/wallet'
import { trpc } from '@/trpc'
import { getAvatarUrl } from '@/utils/account-url'
import { LightningWallet, State, VERSION } from '@shm/shared'
import {
  AlertDialog,
  ArrowDownRight,
  Button,
  Card,
  CardProps,
  Check,
  Checkbox,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  H3,
  Heading,
  InfoListHeader,
  InfoListItem,
  Input,
  Label,
  ListItem,
  Pencil,
  RadioGroup,
  ScrollView,
  Select,
  Separator,
  Share,
  SizableText,
  Spinner,
  TableList,
  Tabs,
  TabsContentProps,
  TabsProps,
  TextArea,
  Tooltip,
  View,
  XGroup,
  XStack,
  YStack,
  toast,
} from '@shm/ui'
import {
  AtSign,
  Biohazard,
  Bitcoin,
  Code2,
  Eye,
  EyeOff,
  Info,
  Minus,
  Plus,
  RadioTower,
  Trash,
} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import React, { useEffect, useId, useMemo, useState } from 'react'
import { dispatchWizardEvent } from 'src/app-account'
import { useAccountKeys } from 'src/models/daemon'

export default function Settings() {
  return (
    <Tabs
      flex={1}
      defaultValue="accounts"
      flexDirection="column"
      borderWidth="$0.25"
      overflow="hidden"
      borderColor="$backgroundStrong"
    >
      <Tabs.List
        aria-label="Manage your account"
        separator={<Separator vertical />}
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
        flex="none"
        style={{
          flexShrink: 0,
        }}
      >
        <Tab value="accounts" icon={AtSign} label="Accounts" />
        <Tab value="gateway" icon={RadioTower} label="Gateway" />
        <Tab value="app-info" icon={Info} label="App Info" />
        <Tab value="wallets" icon={Bitcoin} label="Sponsorship" />
        <Tab value="experiments" icon={Biohazard} label="Experiments" />
        <Tab value="developer" icon={Code2} label="Developers" />
      </Tabs.List>
      <Separator />
      <TabsContent value="accounts">
        <AccountKeys />
      </TabsContent>
      <TabsContent value="gateway">
        <GatewaySettings />
      </TabsContent>
      <TabsContent value="app-info">
        <AppSettings />
        <DevicesInfo />
      </TabsContent>
      <TabsContent value="wallets">
        <WalletsSettings />
      </TabsContent>
      <TabsContent value="experiments">
        <ExperimentsSettings />
      </TabsContent>
      <TabsContent value="developer">
        <DeveloperSettings />
      </TabsContent>
    </Tabs>
  )
}
function SettingsSection({
  title,
  children,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <YStack gap="$3">
      <YStack
        space="$6"
        paddingHorizontal="$6"
        borderWidth={1}
        borderRadius={'$4'}
        borderColor="$borderColor"
        padding="$3"
      >
        <Heading size="$5">{title}</Heading>
        {children}
      </YStack>
    </YStack>
  )
}

export function DeleteDraftLogs() {
  const [isConfirming, setIsConfirming] = useState(false)
  const destroyDraftLogs = trpc.diagnosis.destroyDraftLogFolder.useMutation()

  if (isConfirming) {
    return (
      <Button
        icon={Trash}
        theme="red"
        onPress={() => {
          destroyDraftLogs.mutateAsync().then(() => {
            toast.success('Cleaned up Draft Logs')
            setIsConfirming(false)
          })
        }}
      >
        Confirm Delete Draft Log Folder?
      </Button>
    )
  }
  return (
    <Button
      icon={Trash}
      theme="red"
      onPress={() => {
        setIsConfirming(true)
      }}
    >
      Delete All Draft Logs
    </Button>
  )
}

export function DeveloperSettings() {
  const experiments = useExperiments()
  const writeExperiments = useWriteExperiments()
  const enabledDevTools = experiments.data?.developerTools
  const enabledPubContentDevMenu = experiments.data?.pubContentDevMenu
  const openDraftLogs = trpc.diagnosis.openDraftLogFolder.useMutation()
  return (
    <>
      <SettingsSection title="Developer Tools">
        <SizableText fontSize="$4">
          Adds features across the app for helping diagnose issues. Mostly
          useful for Seed Developers.
        </SizableText>
        <XStack jc="space-between">
          {enabledDevTools ? <EnabledTag /> : <View />}
          <Button
            size="$2"
            theme={enabledDevTools ? 'red' : 'green'}
            onPress={() => {
              writeExperiments.mutate({ developerTools: !enabledDevTools })
            }}
          >
            {enabledDevTools ? 'Disable Debug Tools' : `Enable Debug Tools`}
          </Button>
        </XStack>
      </SettingsSection>
      <SettingsSection title="Publication Content Dev Tools">
        <SizableText fontSize="$4">
          Debug options for the formatting of all publication content
        </SizableText>
        <XStack jc="space-between">
          {enabledPubContentDevMenu ? <EnabledTag /> : <View />}
          <Button
            size="$2"
            theme={enabledPubContentDevMenu ? 'red' : 'green'}
            onPress={() => {
              writeExperiments.mutate({
                pubContentDevMenu: !enabledPubContentDevMenu,
              })
            }}
          >
            {enabledPubContentDevMenu
              ? 'Disable Publication Debug Panel'
              : `Enable Publication Debug Panel`}
          </Button>
        </XStack>
      </SettingsSection>
      <SettingsSection title="Draft Logs">
        <XStack space>
          <Button
            size="$2"
            icon={ExternalLink}
            onPress={() => {
              openDraftLogs.mutate()
            }}
          >
            Open Draft Log Folder
          </Button>
          <DeleteDraftLogs />
        </XStack>
      </SettingsSection>
      {/* <TestURLCheck /> */}
    </>
  )
}

export function ProfileForm({
  profile,
  accountId,
}: {
  profile: Profile
  accountId: string
}) {
  const editProfileDialog = useEditProfileDialog()
  function onCopy() {
    copyTextToClipboard(accountId)
    toast.success('Account ID copied!')
  }
  return (
    <>
      <XStack gap="$4">
        <YStack flex={0} alignItems="center" flexGrow={0}>
          <AvatarForm
            disabled
            onAvatarUpload={async (avatar) => { }}
            url={getAvatarUrl(profile?.avatar)}
          />
        </YStack>
        <YStack flex={1} space>
          <YStack>
            <Label size="$3" htmlFor="accountid">
              Account Id
            </Label>
            <XGroup>
              <XGroup.Item>
                <Input
                  size="$3"
                  id="accountid"
                  userSelect="none"
                  disabled
                  value={accountId}
                  data-testid="account-id"
                  flex={1}
                  hoverStyle={{
                    cursor: 'default',
                  }}
                />
              </XGroup.Item>
              <XGroup.Item>
                <Tooltip content="Copy your account id">
                  <Button size="$3" icon={Copy} onPress={onCopy} />
                </Tooltip>
              </XGroup.Item>
            </XGroup>
          </YStack>
          <XStack>
            <Button
              icon={Pencil}
              onPress={() => {
                editProfileDialog.open(true)
              }}
            >
              Edit My Profile
            </Button>
          </XStack>
        </YStack>
      </XStack>
      {editProfileDialog.content}
    </>
  )
}

export function ProfileInfo() {
  const account = useMyAccount_deprecated()
  const profile = account.data?.profile
  const accountId = account.data?.id

  if (profile && accountId) {
    return (
      <>
        <Heading>
          Profile Information{profile.alias ? ` – ${profile.alias}` : null}
        </Heading>
        <ProfileForm profile={profile} accountId={accountId} />
      </>
    )
  }

  return null
}

function AccountKeys() {
  const deleteKey = useDeleteKey()
  const { data: keys } = useAccountKeys()
  const [selectedAccount, setSelectedAccount] = useState<undefined | string>(
    () => {
      if (keys && keys.length == 1) {
        return keys[0].name
      }
      return undefined
    },
  )

  function handleDeleteCurrentAccount() {
    if (!account) return
    deleteKey.mutateAsync({ name: account.name }).then(() => { })
  }

  const account = useMemo(() => {
    return keys?.find((key) => key.name == selectedAccount)
  }, [selectedAccount])

  const mnemonics = useSavedMnemonics(account?.name)
  const [showWords, setShowWords] = useState<boolean>(false)

  return (
    <XStack style={{ flex: 1, height: '100%' }} gap="$4">
      <YStack f={1} borderColor="$color7" borderWidth={1}>
        <YStack f={1}>
          {keys?.map((key) => (
            <ListItem
              title={key.name}
              hoverTheme
              pressTheme
              bg={selectedAccount == key.name ? '$color5' : undefined}
              onPress={() => setSelectedAccount(key.name)}
            />
          ))}
        </YStack>
        <Separator />
        <XStack p="$1">
          <Button
            icon={Plus}
            onPress={() => dispatchWizardEvent(true)}
            chromeless
            size="$2"
          />
          <AlertDialog native>
            <AlertDialog.Trigger asChild>
              <Button
                disabled={!selectedAccount}
                icon={Minus}
                chromeless
                size="$2"
              />
            </AlertDialog.Trigger>
            <AlertDialog.Portal>
              <AlertDialog.Overlay
                key="overlay"
                animation="quick"
                opacity={0.5}
                enterStyle={{ opacity: 0 }}
                exitStyle={{ opacity: 0 }}
              />
              <AlertDialog.Content
                bordered
                elevate
                key="content"
                animation={[
                  'quick',
                  {
                    opacity: {
                      overshootClamping: true,
                    },
                  },
                ]}
                enterStyle={{ x: 0, y: -20, opacity: 0, scale: 0.9 }}
                exitStyle={{ x: 0, y: 10, opacity: 0, scale: 0.95 }}
                x={0}
                scale={1}
                opacity={1}
                y={0}
              >
                <AlertDialog.Title>Delete Account</AlertDialog.Title>
                <AlertDialog.Description>
                  {`Are you really sure youc ant to delete ${account?.name} account?`}
                </AlertDialog.Description>
                <XStack space="$3" justifyContent="flex-end">
                  <AlertDialog.Cancel asChild>
                    <Button>Cancel</Button>
                  </AlertDialog.Cancel>
                  <AlertDialog.Action asChild>
                    <Button theme="active" onPress={handleDeleteCurrentAccount}>
                      Accept
                    </Button>
                  </AlertDialog.Action>
                </XStack>
              </AlertDialog.Content>
            </AlertDialog.Portal>
          </AlertDialog>
        </XStack>
      </YStack>
      <YStack f={3} borderColor="$color7" borderWidth={1}>
        {mnemonics ? (
          <XStack gap="$3">
            <TextArea
              f={1}
              disabled
              value={
                showWords
                  ? mnemonics.join(', ')
                  : '**** **** **** **** **** **** **** **** **** **** **** ****'
              }
            />
            <Button
              size="$2"
              icon={showWords ? EyeOff : Eye}
              onPress={() => setShowWords((v) => !v)}
            />
            <Button
              size="$2"
              icon={Copy}
              onPress={() => {
                copyTextToClipboard(mnemonics.join(', '))
                toast.success('Copied to clipboard')
              }}
            />
          </XStack>
        ) : null}

        {/* <SizableText>{JSON.stringify(account, null, 4)}</SizableText> */}
      </YStack>
    </XStack>
  )
}

function DevicesInfo() {
  const { data: deviceInfo } = useDaemonInfo()
  return (
    <YStack gap="$3">
      <Heading>My Device</Heading>

      {deviceInfo ? (
        <table>
          <tbody>
            <tr>
              <td>peerId</td>
              <td>{deviceInfo.peerId}</td>
            </tr>
            <tr>
              <td>state</td>
              <td>{State[deviceInfo.state]}</td>
            </tr>
            <tr>
              <td>startTime</td>
              <td>{JSON.stringify(deviceInfo.startTime)}</td>
            </tr>
          </tbody>
        </table>
      ) : null}
    </YStack>
  )
}

export function ExperimentSection({
  experiment,
  onValue,
  value,
}: {
  id: string
  experiment: ExperimentType
  onValue: (v) => void
  value: boolean
}) {
  return (
    <XStack
      alignItems="center"
      space="$6"
      paddingHorizontal="$6"
      borderWidth={1}
      borderRadius={'$4'}
      borderColor="$borderColor"
      padding="$3"
    >
      <Heading fontSize={42}>{experiment.emoji}</Heading>
      <YStack gap="$3" flex={1}>
        <XStack gap="$3" flex={1}>
          <Heading size="$6" marginVertical={0}>
            {experiment.label}
          </Heading>
        </XStack>
        <SizableText>{experiment.description}</SizableText>
        <XStack alignItems="center" jc="space-between">
          {value ? <EnabledTag /> : <View />}
          <Button
            theme={value ? 'red' : 'green'}
            onPress={() => {
              onValue(!value)
            }}
          >
            {value ? 'Disable Feature' : `Enable Feature`}
          </Button>
        </XStack>
      </YStack>
    </XStack>
  )
}

function EnabledTag() {
  return (
    <XStack
      padding="$1"
      paddingHorizontal="$3"
      gap="$3"
      alignItems="center"
      borderRadius="$2"
    >
      <Check size="$1" color="$blue12" />
      <SizableText size="$1" color="$blue12" fontWeight="bold">
        Enabled
      </SizableText>
    </XStack>
  )
}

type ExperimentType = {
  key: string
  label: string
  emoji: string
  description: string
}
const EXPERIMENTS: ExperimentType[] = [
  // {
  //   key: 'webImporting',
  //   label: 'Web Importing',
  //   emoji: '🛰️',
  //   description:
  //     'When opening a Web URL from the Quick Switcher, automatically convert to a Hypermedia Document.',
  // },
  {
    key: 'nostr',
    label: 'Nostr Embeds',
    emoji: '🍀',
    description: 'Embed Nostr notes into documents for permanent referencing.',
  },
]

function GatewaySettings({ }: {}) {
  const gatewayUrl = useGatewayUrl()

  const setGatewayUrl = useSetGatewayUrl()
  const [gwUrl, setGWUrl] = useState('')

  useEffect(() => {
    if (gatewayUrl.data) {
      setGWUrl(gatewayUrl.data)
    }
  }, [gatewayUrl.data])

  return (
    <YStack gap="$3">
      <Heading>Gateway Settings</Heading>
      {gatewayUrl.data ? (
        <TableList>
          <InfoListHeader title="URL" />
          <TableList.Item>
            <XStack gap="$3" width="100%">
              <Input size="$3" flex={1} value={gwUrl} onChangeText={setGWUrl} />
              <Button
                size="$3"
                onPress={() => {
                  setGatewayUrl.mutate(gwUrl)
                  toast.success('Public Gateway URL changed!')
                }}
              >
                Save
              </Button>
            </XStack>
          </TableList.Item>
        </TableList>
      ) : null}
      <PushOnPublishSetting />
      <PushOnCopySetting />
    </YStack>
  )
}

function PushOnCopySetting({ }: {}) {
  const pushOnCopy = usePushOnCopy()
  const id = useId()
  const setPushOnCopy = useSetPushOnCopy()
  if (!pushOnCopy.data) return null
  return (
    <TableList>
      <InfoListHeader title="Push on Copy" />
      <TableList.Item>
        <RadioGroup
          value={pushOnCopy.data}
          onValueChange={(value) => {
            setPushOnCopy.mutate(value)
            toast.success('Push on copy changed!')
          }}
        >
          {[
            { value: 'always', label: 'Always' },
            { value: 'never', label: 'Never' },
            { value: 'ask', label: 'Ask' },
          ].map((option) => {
            return (
              <XStack key={option.value} gap="$3" ai="center">
                <RadioGroup.Item
                  size="$2"
                  value={option.value}
                  id={`${id}-${option.value}`}
                >
                  <RadioGroup.Indicator />
                </RadioGroup.Item>
                <Label size="$2" htmlFor={`${id}-${option.value}`}>
                  {option.label}
                </Label>
              </XStack>
            )
          })}
        </RadioGroup>
      </TableList.Item>
    </TableList>
  )
}

function PushOnPublishSetting({ }: {}) {
  const pushOnPublish = usePushOnPublish()
  const id = React.useId()
  const setPushOnPublish = useSetPushOnPublish()
  if (!pushOnPublish.data) return null
  return (
    <TableList>
      <InfoListHeader title="Push on Publish" />
      <TableList.Item>
        <RadioGroup
          value={pushOnPublish.data}
          onValueChange={(value) => {
            setPushOnPublish.mutate(value)
            toast.success('Push on publish changed!')
          }}
        >
          {[
            { value: 'always', label: 'Always' },
            { value: 'never', label: 'Never' },
            { value: 'ask', label: 'Ask' },
          ].map((option) => {
            return (
              <XStack key={option.value} gap="$3" ai="center">
                <RadioGroup.Item
                  size="$2"
                  value={option.value}
                  id={`${id}-${option.value}`}
                >
                  <RadioGroup.Indicator />
                </RadioGroup.Item>
                <Label size="$2" htmlFor={`${id}-${option.value}`}>
                  {option.label}
                </Label>
              </XStack>
            )
          })}
        </RadioGroup>
      </TableList.Item>
    </TableList>
  )
}

function ExperimentsSettings({ }: {}) {
  const experiments = useExperiments()
  const writeExperiments = useWriteExperiments()
  return (
    <YStack gap="$3">
      <Heading>Experimental Features</Heading>
      <YStack space marginVertical="$4" alignSelf="stretch">
        {EXPERIMENTS.map((experiment) => {
          return (
            <ExperimentSection
              key={experiment.key}
              id={experiment.key}
              value={!!experiments.data?.[experiment.key]}
              experiment={experiment}
              onValue={(isEnabled) => {
                writeExperiments.mutate({ [experiment.key]: isEnabled })
              }}
            />
          )
        })}
      </YStack>
    </YStack>
  )
}

function DeviceItem({ id }: { id: string }) {
  let { data } = usePeerInfo(id)
  let { data: current } = useDaemonInfo()

  let isCurrent = useMemo(() => {
    if (!current?.peerId) return false

    return current.peerId == id
  }, [id, current])

  return (
    <TableList>
      <InfoListHeader
        title={id.substring(id.length - 10)}
        right={
          isCurrent && (
            <Button size="$1" fontWeight="700" disabled>
              current device
            </Button>
          )
        }
      />

      <InfoListItem
        label="Peer ID"
        value={id}
        onCopy={() => {
          copyTextToClipboard(id)
          toast.success('Copied peerID successfully')
        }}
      />

      <Separator />

      <InfoListItem
        label="Device Address"
        value={data?.addrs.sort().join(', ')}
        onCopy={() => {
          copyTextToClipboard(data?.addrs.sort().join(', '))
          toast.success('Copied device address successfully')
        }}
      />
    </TableList>
  )
}

function AppSettings() {
  const ipc = useIPC()
  const versions = useMemo(() => ipc.versions(), [ipc])
  const appInfo = trpc.getAppInfo.useQuery().data
  const { value: autoUpdate, setAutoUpdate } = useAutoUpdatePreference()
  const daemonInfo = trpc.getDaemonInfo.useQuery().data
  let goBuildInfo = ''
  if (daemonInfo?.errors.length) {
    goBuildInfo = daemonInfo.errors.join('\n')
  } else if (daemonInfo?.daemonVersion) {
    goBuildInfo = daemonInfo.daemonVersion
  }
  return (
    <YStack gap="$5">
      <Heading>Application Settings</Heading>
      <TableList>
        <InfoListHeader title="Settings" />
        <TableList.Item ai="center">
          <SizableText size="$1" flex={0} minWidth={140} width={140}>
            Check for updates?
          </SizableText>
          <XStack f={1}>
            <XStack f={1}>
              <Checkbox
                id="auto-update"
                checked={autoUpdate.data == 'true'}
                onCheckedChange={(newVal) => {
                  let val = newVal ? 'true' : 'false'
                  // TODO: use the actual type for autoUpdate
                  setAutoUpdate(val as 'true' | 'false')
                }}
              >
                <Checkbox.Indicator>
                  <Check />
                </Checkbox.Indicator>
              </Checkbox>
            </XStack>
            <Tooltip content="Check for app updates automatically on Launch">
              <Button
                size="$1"
                chromeless
                bg="$backgroundTransparent"
                icon={Info}
              />
            </Tooltip>
          </XStack>
        </TableList.Item>
      </TableList>
      <TableList>
        <InfoListHeader title="User Data" />
        <InfoListItem
          label="Data Directory"
          value={appInfo?.dataDir}
          onCopy={() => {
            if (appInfo?.dataDir) {
              copyTextToClipboard(appInfo?.dataDir)
              toast.success('Copied path successfully')
            }
          }}
          onOpen={() => {
            if (appInfo?.dataDir) {
              ipc.send('open_path', appInfo?.dataDir)
              // openUrl(`file://${appInfo?.dataDir}`)
            }
          }}
        />
        <Separator />
        <InfoListItem
          label="Log Directory"
          value={appInfo?.loggingDir}
          onCopy={() => {
            if (appInfo?.loggingDir) {
              copyTextToClipboard(appInfo?.loggingDir)
              toast.success('Copied path successfully')
            }
          }}
          onOpen={() => {
            if (appInfo?.loggingDir) {
              ipc.send('open_path', appInfo?.loggingDir)
              // openUrl(`file://${appInfo?.loggingDir}`)
            }
          }}
        />
      </TableList>
      <TableList>
        <InfoListHeader
          title="Bundle Information"
          right={
            <Tooltip content="Copy App Info for Developers">
              <Button
                size="$2"
                icon={Copy}
                onPress={() => {
                  copyTextToClipboard(`
                    App Version: ${VERSION}
                    Electron Version: ${versions.electron}
                    Chrome Version: ${versions.chrome}
                    Node Version: ${versions.node}
                    ${goBuildInfo}
                    `)
                  toast.success('Copied Build Info successfully')
                }}
              >
                Copy Debug Info
              </Button>
            </Tooltip>
          }
        />
        <InfoListItem label="App Version" value={VERSION} />
        <Separator />
        <InfoListItem label="Electron Version" value={versions.electron} />
        <Separator />
        <InfoListItem label="Chrome Version" value={versions.chrome} />
        <Separator />
        <InfoListItem label="Node Version" value={versions.node} />
        <Separator />
        <InfoListItem label="Go Build Info" value={goBuildInfo?.split('\n')} />
      </TableList>
    </YStack>
  )
}

const TabsContent = (props: TabsContentProps) => {
  return (
    <Tabs.Content
      // backgroundColor="$background"
      gap="$3"
      flex={1}
      {...props}
    >
      <ScrollView contentContainerStyle={{ flex: 1 }}>
        <YStack gap="$4" padding="$4" paddingBottom="$5" f={1}>
          {props.children}
        </YStack>
      </ScrollView>
    </Tabs.Content>
  )
}

function ExistingWallets({ wallets }: { wallets: LightningWallet[] }) {
  const [wallet, setWallet] = useState<string | undefined>(wallets[0]?.id)
  const { data: invoices } = useInvoicesBywallet(wallet)
  return (
    <YStack gap="$5">
      <Heading>Sponsorship Wallets</Heading>
      <ScrollView horizontal>
        <XStack gap="$6" overflow="visible">
          {wallets?.map((cw) => (
            <WalletCard
              key={cw.id}
              wallet={cw}
              active={wallet && wallet == cw.id ? true : false}
            />
          ))}
        </XStack>
      </ScrollView>
      <Separator />
      <TableList>
        <TableList.Header paddingRight="$2">
          <SizableText fontWeight="700">Invoices</SizableText>
          <XStack flex={1} alignItems="center" justifyContent="flex-end">
            {wallets?.length && (
              <Select
                size="$3"
                id="wallet-payments"
                value={wallet}
                onValueChange={setWallet}
              >
                <Select.Trigger width={280} iconAfter={ChevronDown}>
                  <Select.Value placeholder="Wallet" />
                </Select.Trigger>
                <Select.Content zIndex={200000}>
                  <Select.ScrollUpButton
                    alignItems="center"
                    justifyContent="center"
                    position="relative"
                    width="100%"
                    height="$3"
                  >
                    <YStack zIndex={10}>
                      <ChevronUp size={20} />
                    </YStack>
                    {/* <LinearGradient
                        start={[0, 0]}
                        end={[0, 1]}
                        fullscreen
                        colors={['$background', '$backgroundTransparent']}
                        borderRadius="$4"
                      /> */}
                  </Select.ScrollUpButton>
                  <Select.Viewport minWidth={280}>
                    {wallets?.map((wallet, i) => (
                      <Select.Item index={i} key={wallet.id} value={wallet.id}>
                        <Select.ItemText>
                          <SizableText size="$2">{wallet.name}</SizableText>{' '}
                          <SizableText size="$2">
                            ({wallet.balanceSats} sats)
                          </SizableText>
                        </Select.ItemText>
                        <Select.ItemIndicator marginLeft="auto">
                          <Check size={16} />
                        </Select.ItemIndicator>
                      </Select.Item>
                    ))}
                  </Select.Viewport>
                </Select.Content>
              </Select>
            )}
          </XStack>
        </TableList.Header>
        {invoices?.received?.map((invoice) => (
          <>
            <Separator />
            <TableList.Item>
              <XStack gap="$4" alignItems="center" flex={1}>
                <ArrowDownRight color="$color10" size={24} />
                <SizableText
                  size="$3"
                  flex={1}
                  overflow="hidden"
                  textOverflow="ellipsis"
                  whiteSpace="nowrap"
                >
                  {invoice?.PaymentHash}
                </SizableText>
                <SizableText size="$1" flex={1} fontWeight="600">
                  {invoice?.IsPaid ? 'PAID' : 'NOT PAID'}
                </SizableText>
                <SizableText
                  size="$2"
                  fontWeight="700"
                  flex={0}
                  flexShrink={0}
                  color="$blue8"
                >
                  {invoice?.Amount ? `${invoice.Amount} sats` : 'No amount'}
                </SizableText>
              </XStack>
            </TableList.Item>
          </>
        ))}
      </TableList>
    </YStack>
  )
}

function NoWallets() {
  const { optIn, walletCheck } = useWalletOptIn()
  const isLoading = optIn.isLoading || walletCheck.isLoading
  return (
    <YStack gap="$4">
      <Heading>Sponsorship Wallets</Heading>
      {isLoading ? (
        <Spinner />
      ) : (
        <>
          <SizableText>No Lightning Wallet</SizableText>
          <Button
            onPress={() => {
              optIn.mutate()
            }}
          >
            Enable Lightning Sponsorship
          </Button>
        </>
      )}
    </YStack>
  )
}

function WalletsSettings() {
  const { data: wallets, isLoading: isLoadingWallets } = useWallets()
  if (isLoadingWallets) return null
  if (wallets?.length) return <ExistingWallets wallets={wallets} />
  return <NoWallets />
}

function WalletCard({
  wallet,
  active = false,
  ...props
}: CardProps & { wallet: LightningWallet; active?: boolean }) {
  const mutation = useExportWallet()

  async function handleExport() {
    try {
      let res = await mutation.mutateAsync({ id: wallet.id })
      if (!res) {
        appError('Error: ExportWallet error')
      } else {
        copyTextToClipboard(res.credentials)
        toast.success('Wallet Exported and copied to your clipboard', {
          duration: 5000,
        })
      }
    } catch (error) {
      appError(`Error: ExportWallet error: ${error}`, { error })
    }
  }

  return (
    <Card
      animation="medium"
      size="$4"
      theme="green"
      width={260}
      // height={120}
      scale={0.975}
      hoverStyle={{ scale: 1 }}
      pressStyle={{ scale: 0.95 }}
      borderRadius="$4"
      borderWidth={2}
      borderColor="$borderColor"
      elevation="$2"
      {...props}
    >
      <Card.Header>
        <XStack>
          <YStack flex={1}>
            <SizableText color="$color10">{wallet.name}</SizableText>
            <H3 color="$color12">{wallet.balanceSats} sats</H3>
          </YStack>
          {/* <Tooltip content="default wallet">
            <Button
              size="$3"
              chromeless
              icon={
                <Star color={wallet.isDefault ? 'yellow' : 'transparent'} />
              }
              scaleIcon={2}
              padding="$1"
            />
          </Tooltip> */}
        </XStack>
      </Card.Header>
      <Card.Footer padded>
        <XStack flex={1} />
        <Button
          disabled={mutation.isLoading}
          size="$2"
          onPress={handleExport}
          icon={<Share />}
        >
          Export
        </Button>
      </Card.Footer>
    </Card>
  )
}

function Tab(props: TabsProps & { icon: any; label: string }) {
  const { icon: Icon, label, ...rest } = props
  return (
    <Tabs.Tab
      data-testid={`tab-${props.value}`}
      borderRadius={0}
      flexDirection="column"
      {...props}
      p="$4"
      paddingBottom="$3"
      height="auto"
      gap="$2"
    >
      <Icon size={20} />
      <SizableText flex={1} size="$1" textAlign="left">
        {label}
      </SizableText>
    </Tabs.Tab>
  )
}
