import {useMyAccount} from '@mintter/app/models/accounts'
import {useDaemonInfo} from '@mintter/app/models/daemon'
import {usePeerInfo} from '@mintter/app/models/networking'
import {useInvoicesBywallet, useWallets} from '@mintter/app/models/payments'
import {ObjectKeys} from '@mintter/app/utils/object-keys'
import {trpc} from '@mintter/desktop/src/trpc'
import {APP_VERSION, LightningWallet, Profile} from '@mintter/shared'
import {
  ArrowDownRight,
  Button,
  Card,
  CardProps,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  H3,
  Heading,
  Input,
  Label,
  Pencil,
  ScrollView,
  Select,
  Separator,
  Share,
  SizableText,
  Tabs,
  TabsContentProps,
  Tooltip,
  View,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {Trash} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ReactNode, useMemo, useState} from 'react'
import toast from 'react-hot-toast'
import {useGRPCClient, useIPC} from '../app-context'
import {AvatarForm} from '../components/avatar-form'
import {useEditProfileDialog} from '../components/edit-profile-dialog'
import {TableList} from '../components/table-list'
import {useExperiments, useWriteExperiments} from '../models/experiments'
import {useExportWallet} from '../models/payments'
import {useOpenUrl} from '../open-url'
import {getAvatarUrl} from '../utils/account-url'

export default function Settings() {
  return (
    <Tabs
      flex={1}
      defaultValue="account"
      flexDirection="row"
      orientation="vertical"
      borderWidth="$0.25"
      overflow="hidden"
      borderColor="$borderColor"
    >
      <Tabs.List
        aria-label="Manage your account"
        separator={<Separator />}
        minWidth={200}
      >
        <Tabs.Tab value="account" data-testid="tab-account" borderRadius={0}>
          <SizableText flex={1} textAlign="left">
            Account
          </SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="settings" data-testid="tab-settings" borderRadius={0}>
          <SizableText flex={1} textAlign="left">
            App Info
          </SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="wallets" data-testid="tab-wallets" borderRadius={0}>
          <SizableText flex={1} textAlign="left">
            Wallets
          </SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="experimental" data-testid="tab-experimental">
          <SizableText flex={1} textAlign="left">
            Experiments
          </SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="developer" data-testid="tab-developer">
          <SizableText flex={1} textAlign="left">
            Developers
          </SizableText>

          <SizableText
            size="$1"
            fontSize={10}
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$1"
            overflow="hidden"
            backgroundColor="$color8"
            color="$color1"
            theme="yellow"
          >
            NEW
          </SizableText>
        </Tabs.Tab>
      </Tabs.List>
      <Separator vertical />
      <TabsContent value="account">
        <ProfileInfo />
        <DevicesInfo />
      </TabsContent>
      <TabsContent value="settings">
        <AppSettings />
      </TabsContent>
      <TabsContent value="wallets">
        <WalletsSettings />
      </TabsContent>
      <TabsContent value="experimental">
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
}: React.PropsWithChildren<{title: string}>) {
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
          useful for Mintter Developers.
        </SizableText>
        <XStack jc="space-between">
          {enabledDevTools ? <EnabledTag /> : <View />}
          <Button
            theme={enabledDevTools ? 'red' : 'green'}
            onPress={() => {
              writeExperiments.mutate({developerTools: !enabledDevTools})
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
      {/* <TestFileUpload /> */}
    </>
  )
}

function TestFileUpload() {
  const upload = trpc.webImporting.importWebFile.useMutation()
  return (
    <Button
      onPress={() => {
        upload
          .mutateAsync(
            'https://cdn.vocab.com/articles/ll/meme-and-variation/memes_clip_image002_0000.jpg',
          )
          .then(({cid, type}) => {
            toast.success(`Imported to CID: ${cid}. Type is ${type}`)
          })
          .catch((e) => {
            toast.error('Failed to import this file')
          })
      }}
      theme="blue"
    >
      Test Image Import from URL
    </Button>
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
            onAvatarUpload={async (avatar) => {}}
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
  const account = useMyAccount()
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

function DevicesInfo({}: {}) {
  const account = useMyAccount()
  const devices = account.data?.devices
  return (
    <YStack gap="$3">
      <Heading>My Devices</Heading>
      {devices && ObjectKeys(devices).length
        ? Object.keys(devices).map((deviceId) => (
            <DeviceItem key={deviceId} id={deviceId} />
          ))
        : null}
    </YStack>
  )
}

function InfoListHeader({title, right}: {title: string; right?: ReactNode}) {
  return (
    <TableList.Header>
      <SizableText fontWeight="700">{title}</SizableText>
      <XStack flex={1} alignItems="center" justifyContent="flex-end">
        {right}
      </XStack>
    </TableList.Header>
  )
}

function InfoListItem({
  label,
  value,
  copyable,
  openable,
}: {
  label: string
  value?: string | string[]
  copyable?: boolean
  openable?: boolean
}) {
  const openUrl = useOpenUrl()
  const values = Array.isArray(value) ? value : [value]
  return (
    <TableList.Item>
      <SizableText size="$1" flex={0} minWidth={140} width={140}>
        {label}:
      </SizableText>
      <YStack flex={1}>
        {values.map((value, index) => (
          <SizableText
            flex={1}
            key={index}
            fontFamily="$mono"
            size="$1"
            width="100%"
            overflow="hidden"
            textOverflow="ellipsis"
            userSelect="text"
          >
            {value}
          </SizableText>
        ))}
      </YStack>
      {!!value && copyable ? (
        <Tooltip content={`Copy ${label}`}>
          <Button
            size="$2"
            marginLeft="$2"
            icon={Copy}
            onPress={() => {
              copyTextToClipboard(value)
              toast.success(`${label} copied!`)
            }}
          />
        </Tooltip>
      ) : null}
      {!!value && openable ? (
        <Tooltip content={`Open ${label}`}>
          <Button
            size="$2"
            marginLeft="$2"
            icon={ExternalLink}
            onPress={() => {
              openUrl(`file://${value}`)
            }}
          />
        </Tooltip>
      ) : null}
    </TableList.Item>
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
      backgroundColor="$blue12"
      padding="$2"
      paddingHorizontal="$3"
      gap="$3"
      alignItems="center"
      borderRadius="$2"
    >
      <Check size="$1" color="$color1" />
      <SizableText size="$1" color="$color1" fontWeight="bold">
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
  {
    key: 'webImporting',
    label: 'Web Importing',
    emoji: '🛰️',
    description:
      'When opening a Web URL from the Quick Switcher, automatically convert to a Hypermedia Document.',
  },
  // {
  //   key: 'nostr',
  //   label: 'Nostr?',
  //   emoji: '🍀',
  //   description: 'It is your lucky day.',
  // },
]

function ExperimentsSettings({}: {}) {
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
                writeExperiments.mutate({[experiment.key]: isEnabled})
              }}
            />
          )
        })}
      </YStack>
    </YStack>
  )
}

function DeviceItem({id}: {id: string}) {
  let {status, data} = usePeerInfo(id)
  let {data: current} = useDaemonInfo()

  let isCurrent = useMemo(() => {
    if (!current?.deviceId) return false

    return current.deviceId == id
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

      <InfoListItem label="Peer ID" value={id} copyable />

      <Separator />

      <InfoListItem
        label="Device Address"
        value={data?.addrs.join(',')}
        copyable
      />
    </TableList>
  )
}

function AppSettings() {
  const grpcClient = useGRPCClient()
  const ipc = useIPC()
  const versions = useMemo(() => ipc.versions(), [ipc])
  const appInfo = trpc.getAppInfo.useQuery().data
  const daemonInfo = trpc.getDaemonInfo.useQuery().data
  return (
    <YStack gap="$5">
      <Heading>Application Settings</Heading>
      <TableList>
        <InfoListHeader title="User Data" />
        <InfoListItem
          label="Data Directory"
          value={appInfo?.dataDir}
          copyable
          openable
        />
        <Separator />
        <InfoListItem
          label="Log File"
          value={appInfo?.logFilePath}
          copyable
          openable
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
                  copyTextToClipboard(`App Version: ${APP_VERSION}
Electron Version: ${versions.electron}
Chrome Version: ${versions.chrome}
Node Version: ${versions.node}
Go Build Info:
    ${daemonInfo?.replace(/\n/g, '\n    ')}`)
                }}
              >
                Copy Debug Info
              </Button>
            </Tooltip>
          }
        />
        <InfoListItem label="App Version" value={APP_VERSION} />
        <Separator />
        <InfoListItem label="Electron Version" value={versions.electron} />
        <Separator />
        <InfoListItem label="Chrome Version" value={versions.chrome} />
        <Separator />
        <InfoListItem label="Node Version" value={versions.node} />
        <Separator />
        <InfoListItem label="Go Build Info" value={daemonInfo?.split('\n')} />
      </TableList>
    </YStack>
  )
}

const TabsContent = (props: TabsContentProps) => {
  return (
    <Tabs.Content
      backgroundColor="$background"
      key="tab3"
      gap="$3"
      flex={1}
      {...props}
    >
      <ScrollView>
        <YStack gap="$4" padding="$4" paddingBottom="$7">
          {props.children}
        </YStack>
      </ScrollView>
    </Tabs.Content>
  )
}

function WalletsSettings() {
  const {data: wallets} = useWallets()
  const [wallet, setWallet] = useState<string | undefined>(undefined)
  const {data: invoices} = useInvoicesBywallet(wallet)

  return (
    <YStack gap="$5">
      <Heading>Wallets</Heading>
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

function WalletCard({
  wallet,
  active = false,
  ...props
}: CardProps & {wallet: LightningWallet; active?: boolean}) {
  const mutation = useExportWallet()

  async function handleExport() {
    try {
      let res = await mutation.mutateAsync({id: wallet.id})
      if (!res) {
        toast.error('Error: ExportWallet error')
        console.error('Error: ExportWallet error')
      } else {
        copyTextToClipboard(res.credentials)
        toast.success('Wallet Exported and copied to your clipboard', {
          duration: 5000,
        })
      }
    } catch (error) {
      toast.error(`Error: ExportWallet error: ${JSON.stringify(error)}`)
      console.error('Error: ExportWallet error', error)
    }
  }

  return (
    <Card
      animation="bouncy"
      size="$4"
      theme="green"
      width={260}
      // height={120}
      scale={0.975}
      hoverStyle={{scale: 1}}
      pressStyle={{scale: 0.95}}
      borderRadius="$4"
      borderWidth={1}
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
