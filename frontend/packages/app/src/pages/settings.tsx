import {AvatarForm} from '@mintter/app/src/components/avatar-form'
import {TableList} from '@mintter/app/src/components/table-list'
import {AccessURLRow} from '@mintter/app/src/components/url'
import {
  useAccount,
  useMyAccount,
  useSetProfile,
} from '@mintter/app/src/models/accounts'
import {useDaemonInfo} from '@mintter/app/src/models/daemon'
import {usePeerInfo} from '@mintter/app/src/models/networking'
import {useInvoicesBywallet, useWallets} from '@mintter/app/src/models/payments'
import {ObjectKeys} from '@mintter/app/src/utils/object-keys'
import {hostnameStripProtocol} from '@mintter/app/src/utils/site-hostname'
import {
  LightningWallet,
  Member,
  Member_Role,
  Profile,
  SiteConfig,
  SiteInfo,
} from '@mintter/shared'
import {
  Add,
  Back,
  Button,
  Card,
  CardProps,
  Check,
  ChevronDown,
  ChevronUp,
  Close,
  Copy,
  Dialog,
  Fieldset,
  Form,
  Forward,
  H3,
  Heading,
  Input,
  Label,
  ScrollView,
  Select,
  Separator,
  SizableText,
  Spinner,
  Star,
  Tabs,
  TabsContentProps,
  TextArea,
  Tooltip,
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'
import {ArrowDownRight, X} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ComponentProps, useEffect, useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {TextInput} from 'react-native'
import {useGRPCClient} from '../app-context'
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
        disablePassBorderRadius="end"
        aria-label="Manage your account"
        separator={<Separator />}
        minWidth={200}
      >
        <Tabs.Tab value="account" data-testid="tab-account">
          <SizableText flex={1} textAlign="left">
            Account
          </SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="settings" data-testid="tab-settings">
          <SizableText flex={1} textAlign="left">
            Settings
          </SizableText>
        </Tabs.Tab>
        {/* <Tabs.Tab value="wallets" data-testid="tab-wallets">
          <SizableText flex={1} textAlign="left">
            Wallets
          </SizableText>

          <SizableText
            size="$0.5"
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
        </Tabs.Tab> */}
      </Tabs.List>
      <Separator vertical />
      <TabsContent value="account">
        <ProfileInfo />
        <DevicesInfo />
      </TabsContent>
      <TabsContent value="settings">
        <AppSettings />
      </TabsContent>
      {/* <TabsContent value="wallets">
        <WalletsSettings />
      </TabsContent> */}
    </Tabs>
  )
}

export function ProfileForm({
  profile,
  accountId,
}: {
  profile: Profile
  accountId: string
}) {
  const setProfile = useSetProfile()
  const [alias, setAlias] = useState(profile.alias)
  const [bio, setBio] = useState(profile.bio)
  function onCopy() {
    copyTextToClipboard(accountId)
    toast.success('Account ID copied!')
  }

  return (
    <XStack gap="$4">
      <YStack flex={0} alignItems="center" flexGrow={0}>
        <AvatarForm
          onAvatarUpload={async (avatar) => {
            await setProfile.mutateAsync(new Profile({avatar}))
            toast.success('Avatar changed')
          }}
          url={getAvatarUrl(profile?.avatar)}
        />
      </YStack>
      <YStack flex={1}>
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
        <Form
          onSubmit={() => {
            setProfile.mutate(new Profile({...profile, alias, bio}))
          }}
        >
          <Label htmlFor="alias">Alias</Label>
          <Input id="alias" value={alias} onChangeText={setAlias} />
          <Label htmlFor="bio">Bio</Label>
          <TextArea
            id="bio"
            value={bio}
            onChangeText={setBio}
            placeholder="A little bit about yourself..."
          />

          <XStack gap="$4" alignItems="center" paddingTop="$3">
            <Form.Trigger asChild>
              <Button disabled={setProfile.isLoading}>Save</Button>
            </Form.Trigger>
            {setProfile.data && (
              <SizableText theme="green">update success!</SizableText>
            )}
          </XStack>
        </Form>
      </YStack>
    </XStack>
  )
}

export function ProfileInfo() {
  const account = useMyAccount()
  const profile = account.data?.profile
  const accountId = account.data?.id

  if (profile && accountId) {
    return (
      <>
        <Heading>Profile information</Heading>
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
    <YStack data-testid="account-device-list" gap="$3">
      <Heading>Devices</Heading>
      {devices && ObjectKeys(devices).length
        ? Object.keys(devices).map((deviceId) => (
            <DeviceItem key={deviceId} id={deviceId} />
          ))
        : null}
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
      <TableList.Header>
        <SizableText fontWeight="700">
          {id.substring(id.length - 10)}
        </SizableText>
        <XStack flex={1} alignItems="center" justifyContent="flex-end">
          {isCurrent && (
            <Button size="$1" fontWeight="700" disabled>
              current device
            </Button>
          )}
        </XStack>
      </TableList.Header>
      <TableList.Item>
        <SizableText size="$1" flex={0} width={80}>
          Alias:
        </SizableText>
        <SizableText
          size="$1"
          flex={1}
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {status == 'success' ? id.substring(id.length - 10) : '...'}
        </SizableText>
      </TableList.Item>

      <Separator />
      <TableList.Item>
        <SizableText size="$1" flex={0} width={80} flexShrink={0} flexGrow={0}>
          Id:
        </SizableText>
        <SizableText
          size="$1"
          flex={1}
          overflow="hidden"
          textOverflow="ellipsis"
          userSelect="text"
        >
          {id}
        </SizableText>
      </TableList.Item>

      <Separator />
      <TableList.Item>
        <SizableText size="$1" flex={0} width={80} flexShrink={0} flexGrow={0}>
          Addresses:
        </SizableText>
        <XStack flex={1} position="relative" space="$2">
          <SizableText
            fontFamily="$mono"
            size="$1"
            width="100%"
            overflow="hidden"
            textOverflow="ellipsis"
            userSelect="text"
          >
            {status == 'success' ? data?.addrs.join(',') : '...'}
          </SizableText>
          <Tooltip content="Copy Device Address">
            {data?.addrs ? (
              <Button
                size="$2"
                icon={Copy}
                onPress={() => {
                  // TODO: make sure this is true all the time.
                  copyTextToClipboard(data?.addrs.join(',')!)
                  toast.success('Device address copied!')
                }}
              />
            ) : null}
          </Tooltip>
        </XStack>
      </TableList.Item>
    </TableList>
  )
}

function AppSettings() {
  const grpcClient = useGRPCClient()
  async function onReloadSync() {
    await grpcClient.daemon.forceSync({})
    toast.success('reload sync successful!')
  }

  return (
    <YStack gap="$5">
      <Heading>Application Settings</Heading>
      <TableList>
        <TableList.Header>
          <SizableText fontWeight="700">Bundle Information</SizableText>
        </TableList.Header>
        <TableList.Item>
          <SizableText
            size="$1"
            flex={0}
            width={80}
            flexShrink={0}
            flexGrow={0}
          >
            Version:
          </SizableText>
          <SizableText
            size="$1"
            flex={1}
            overflow="hidden"
            textOverflow="ellipsis"
            userSelect="text"
          >
            {import.meta.env.APP_VERSION}
          </SizableText>
        </TableList.Item>
      </TableList>
      <Separator />
      <YStack>
        <Button onPress={onReloadSync}>Reload Database</Button>
      </YStack>
    </YStack>
  )
}

function SettingsNavBack({
  onDone,
  title,
  icon,
}: {
  onDone: () => void
  title: string
  icon?: ComponentProps<typeof Button>['icon']
}) {
  return (
    <Button size="$2" onPress={onDone} icon={icon || Back}>
      {title}
    </Button>
  )
}

function SettingsSection({
  title,
  children,
}: {
  title?: string
  children: React.ReactNode
}) {
  return (
    <YStack gap="$3">
      <Heading>{title}</Heading>
      {children}
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
  return (
    <Card
      animation="bouncy"
      size="$4"
      theme="green"
      width={260}
      height={120}
      scale={0.975}
      hoverStyle={{scale: 1}}
      pressStyle={{scale: 0.95}}
      backgroundColor="$color8"
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
          <Tooltip content="default wallet">
            <Button
              size="$3"
              chromeless
              icon={
                <Star color={wallet.isDefault ? 'yellow' : 'transparent'} />
              }
              scaleIcon={2}
              padding="$1"
            />
          </Tooltip>
        </XStack>
      </Card.Header>
    </Card>
  )
}
