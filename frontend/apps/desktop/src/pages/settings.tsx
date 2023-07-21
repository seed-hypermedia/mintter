import {daemonClient} from '@app/api-clients'
import {Box} from '@app/components/box'
import {useAccount, useMyAccount, useSetProfile} from '@app/models/accounts'
import {useDaemonInfo} from '@app/models/daemon'
import {usePeerInfo} from '@app/models/networking'
import {useInvoicesBywallet, useWallets} from '@app/models/payments'
import {
  useAddSite,
  useInviteMember,
  useRemoveMember,
  useRemoveSite,
  useSiteInfo,
  useSiteList,
  useSiteMembers,
  useWriteSiteInfo,
} from '@app/models/sites'
import {TableList} from '@app/table-list'
import {ObjectKeys} from '@app/utils/object-keys'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {AvatarForm} from '@components/avatar-form'
import {Tooltip} from '@components/tooltip'
import {AccessURLRow} from '@components/url'
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
  XGroup,
  XStack,
  YStack,
} from '@mintter/ui'

import {ArrowDownRight, X} from '@tamagui/lucide-icons'
import copyTextToClipboard from 'copy-text-to-clipboard'
import {ComponentProps, useEffect, useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'

export default function Settings({}: {}) {
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
        <Tabs.Tab value="sites" data-testid="tab-sites">
          <SizableText flex={1} textAlign="left">
            Web Sites
          </SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="wallets" data-testid="tab-wallets">
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
        </Tabs.Tab>
      </Tabs.List>
      <Separator vertical />
      <TabsContent value="account">
        <ProfileInfo />
        <DevicesInfo />
      </TabsContent>
      <TabsContent value="settings" data-tauri-drag-region>
        <AppSettings />
      </TabsContent>
      <TabsContent value="sites" data-tauri-drag-region>
        <SitesSettings />
      </TabsContent>
      <TabsContent value="wallets" data-tauri-drag-region>
        <WalletsSettings />
      </TabsContent>
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
          url={
            profile?.avatar
              ? `http://localhost:55001/ipfs/${profile.avatar}`
              : undefined
          }
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
        <YStack flex={1} position="relative">
          <SizableText
            size="$1"
            width="100%"
            overflow="hidden"
            textOverflow="ellipsis"
            userSelect="text"
          >
            {status == 'success' ? data?.addrs.join(',') : '...'}
          </SizableText>
        </YStack>
      </TableList.Item>
    </TableList>
  )
}

function AppSettings() {
  async function onReloadSync() {
    await daemonClient.forceSync({})
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
            {import.meta.env.PACKAGE_VERSION}
          </SizableText>
        </TableList.Item>
        <Separator />

        <TableList.Item>
          <SizableText
            size="$1"
            flex={0}
            width={80}
            flexShrink={0}
            flexGrow={0}
          >
            Tauri version
          </SizableText>
          <YStack flex={1} position="relative">
            <SizableText
              size="$1"
              width="100%"
              overflow="hidden"
              textOverflow="ellipsis"
              userSelect="text"
            >
              {import.meta.env.TAURI_PLATFORM_VERSION}
            </SizableText>
          </YStack>
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
function InviteMemberDialog({url, onDone}: {url: string; onDone: () => void}) {
  return (
    <YStack gap="$3">
      <SizableText>Copy and send this secret editor invite URL</SizableText>
      {url && <AccessURLRow url={url} title={url} enableLink={false} />}
      <Button onPress={onDone}>Done</Button>
    </YStack>
  )
}
export function useInviteDialog(hostname: string) {
  const [isOpen, setIsOpen] = useState<null | string>(null)
  const invite = useInviteMember(hostname)

  function open() {
    invite.mutateAsync().then((inviteToken) => {
      setIsOpen(`${hostname}/invite/${inviteToken}`)
    })
  }
  return {
    content: (
      <Dialog open={!!isOpen} onOpenChange={() => setIsOpen(null)}>
        <Dialog.Portal>
          <Dialog.Overlay
            animation="quick"
            opacity={0.5}
            enterStyle={{opacity: 0}}
            exitStyle={{opacity: 0}}
          />
          <Dialog.Content
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
            enterStyle={{x: 0, y: -20, opacity: 0, scale: 0.9}}
            exitStyle={{x: 0, y: 10, opacity: 0, scale: 0.95}}
            space
          >
            <Dialog.Title>Invite Code</Dialog.Title>
            {isOpen && (
              <InviteMemberDialog url={isOpen} onDone={() => setIsOpen(null)} />
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    ),
    open,
  }
}

function getNameOfRole(role: Member_Role): string {
  if (role === Member_Role.OWNER) return 'Owner'
  if (role === Member_Role.EDITOR) return 'Editor'
  return 'Unauthorized'
}

function SiteMemberRow({
  member,
  hostname,
  isOwner,
}: {
  member: Member
  hostname: string
  isOwner: boolean
}) {
  const {data: account} = useAccount(member.accountId)
  const remove = useRemoveMember(hostname)
  const [hovering, setHover] = useState(false)

  let hoverProps = useMemo(() => {
    if (!isOwner && member.accountId == account?.id) return {}

    return {
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
    }
  }, [member.accountId, isOwner, account])

  return (
    <TableList.Item
      {...hoverProps}
      // onPressIn={() => setHover(true)}
      // onPressOut={() => setHover(false)}
    >
      <SizableText flex={1}>
        {account?.profile?.alias ||
          `...${member.accountId.substring(member.accountId.length - 16)}`}
      </SizableText>
      {member.role === Member_Role.OWNER && (
        <Button size="$1" disabled>
          owner
        </Button>
      )}
      {hovering && isOwner && member.accountId !== account?.id ? (
        <Button
          theme="red"
          size="$1"
          onPress={() => {
            remove.mutate(member.accountId)
          }}
        >
          Remove
        </Button>
      ) : null}
    </TableList.Item>
  )
}
function SiteMembers({
  hostname,
  accountId,
  isOwner,
}: {
  hostname: string
  accountId: string
  isOwner: boolean
}) {
  const {content, open} = useInviteDialog(hostname)

  const {data: members} = useSiteMembers(hostname)

  return (
    <TableList>
      <TableList.Header>
        <SizableText flex={1} fontWeight="700">
          Members
        </SizableText>
        {isOwner ? (
          <Button size="$2" onPress={open} icon={Add}>
            Invite Editor
          </Button>
        ) : null}
        {content}
      </TableList.Header>
      {members?.map((member) => (
        <SiteMemberRow
          key={member.accountId}
          member={member}
          isOwner={isOwner}
          hostname={hostname}
        />
      ))}
    </TableList>
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

function SiteInfoForm({
  info,
  onSubmit,
  isOwner,
}: {
  info: SiteInfo
  onSubmit: (s: Partial<SiteInfo>) => void
  isOwner: boolean
}) {
  const [title, setTitle] = useState(info.title)
  const [description, setDescription] = useState(info.description)
  return (
    <YStack gap="$3">
      <YStack>
        <Label htmlFor="site-title">Title</Label>
        <Input
          id="site-title"
          value={title}
          disabled={!isOwner}
          editable={isOwner}
          onChangeText={isOwner ? (val) => setTitle(val) : undefined}
        />
      </YStack>
      <YStack>
        <Label htmlFor="site-description">Description</Label>
        <TextArea
          id="site-title"
          value={description}
          disabled={!isOwner}
          editable={isOwner}
          onChangeText={
            isOwner ? (val: string) => setDescription(val) : undefined
          }
        />
      </YStack>
      {isOwner ? (
        <Button
          size="$2"
          onPress={() => {
            onSubmit({title, description})
          }}
        >
          Save
        </Button>
      ) : null}
    </YStack>
  )
}

function SiteInfoTable({info}: {info: SiteInfo}) {
  const {title, description} = info
  return (
    <TableList>
      <TableList.Item>
        <SizableText size="$3" flex={0} width={80} fontWeight="700">
          Title
        </SizableText>
        <Separator vertical marginHorizontal={10} />
        <SizableText
          size="$3"
          flex={2}
          overflow="hidden"
          textOverflow="ellipsis"
        >
          {title}
        </SizableText>
      </TableList.Item>

      <Separator />
      <TableList.Item>
        <SizableText
          size="$3"
          flex={0}
          width={80}
          flexShrink={0}
          flexGrow={0}
          fontWeight="700"
        >
          Description
        </SizableText>
        <Separator vertical marginHorizontal={10} />
        <SizableText
          size="$3"
          flex={2}
          overflow="hidden"
          textOverflow="ellipsis"
          userSelect="text"
        >
          {description}
        </SizableText>
      </TableList.Item>
    </TableList>
  )
}

function SiteSettings({
  hostname,
  onDone,
  accountId,
}: {
  hostname: string
  onDone: () => void
  accountId: string
}) {
  const {data: members, isLoading} = useSiteMembers(hostname)
  const isOwner = useMemo(
    () =>
      !!members?.find(
        (member) =>
          member.accountId === accountId && member.role === Member_Role.OWNER,
      ),
    [members, accountId],
  )

  const removeSite = useRemoveSite(hostname, {
    onSuccess: () => onDone(),
  })

  return (
    <>
      <XStack alignItems="center" gap="$4">
        <SettingsNavBack title="Sites" onDone={onDone} />
        <Heading flex={1}>{hostnameStripProtocol(hostname)}</Heading>
        <Button
          theme="red"
          size="$2"
          onPress={() => removeSite.mutate()}
          icon={Close}
        >
          Remove Site
        </Button>
      </XStack>

      {isLoading ? (
        <Spinner />
      ) : (
        <YStack gap="$5">
          <SiteInfoSection hostname={hostname} isOwner={isOwner} />
          <Separator />
          <SiteMembers
            hostname={hostname}
            accountId={accountId}
            isOwner={isOwner}
          />
        </YStack>
      )}
    </>
  )
}

function SiteInfoSection({
  hostname,
  isOwner,
}: {
  hostname: string
  isOwner: boolean
}) {
  const siteInfo = useSiteInfo(hostname)
  const writeSiteInfo = useWriteSiteInfo(hostname)
  return (
    <SettingsSection title="Public SEO Info">
      {siteInfo?.data ? (
        isOwner ? (
          <SiteInfoForm
            info={siteInfo.data}
            onSubmit={(info) => writeSiteInfo.mutate(info)}
            isOwner={isOwner}
          />
        ) : (
          <SiteInfoTable info={siteInfo.data} />
        )
      ) : null}
    </SettingsSection>
  )
}

function NewSite({onDone}: {onDone: (activeSite: string | null) => void}) {
  const addSite = useAddSite({
    onSuccess: (result, input) => onDone(input.hostname),
  })
  const [siteUrl, setSiteUrl] = useState<string | null>(null)
  const hostRef = useRef<HTMLInputElement>(null)

  // focus input on first render
  useEffect(() => {
    if (hostRef.current) {
      hostRef.current.focus()
    }
  }, [])
  return (
    <>
      <YStack gap="$1" alignItems="flex-start">
        <SettingsNavBack icon={X} title="Cancel" onDone={() => onDone(null)} />
        <h2>Add Mintter Web Site</h2>
      </YStack>
      {addSite.error ? (
        //@ts-ignore
        <SizableText theme="red">{addSite.error?.message}</SizableText>
      ) : null}
      {addSite.isLoading ? <Spinner /> : null}
      <p>Follow the self-hosting guide and copy the invite URL:</p>
      <Box
        as={'form'}
        onSubmit={(e) => {
          e.preventDefault()
          const matchedHostProtocol = siteUrl?.match(
            /^(https?:\/\/)?([^/]*)\/?/,
          )
          const matchedInviteURL = siteUrl?.match(
            /^(https?:\/\/)?([^/]*)(\/invite\/(.*))?$/,
          )
          const protocol = matchedHostProtocol?.[1] ?? 'https://'
          const hostname = matchedHostProtocol?.[2] || matchedInviteURL?.[2]
          const inviteToken = matchedInviteURL?.[4]
          const fullHostname = protocol + hostname
          console.log({fullHostname, matchedHostProtocol, siteUrl, hostname})
          if (hostname) addSite.mutate({hostname: fullHostname, inviteToken})
        }}
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1em',
        }}
      >
        <Fieldset
          paddingHorizontal={0}
          margin={0}
          borderColor="transparent"
          borderWidth={0}
        >
          <Label htmlFor="host">site domain or invite url</Label>
          <Input
            //@ts-expect-error
            ref={hostRef}
            id="host"
            onChangeText={setSiteUrl}
            value={siteUrl ?? undefined}
          />
        </Fieldset>

        <Button disabled={!siteUrl} size="$2" color="green">
          Connect + Add Site
        </Button>
      </Box>
    </>
  )
}

const NewSitePage = Symbol('NewSitePage')
function SitesSettings({}: {}) {
  const daemonInfo = useDaemonInfo()
  const accountId = daemonInfo.data?.accountId
  const [activeSitePage, setActiveSitePage] = useState<
    string | typeof NewSitePage | null
  >(null)
  if (!accountId) return null
  if (activeSitePage === NewSitePage) {
    return <NewSite onDone={(s: string | null) => setActiveSitePage(s)} />
  }
  if (typeof activeSitePage === 'string') {
    return (
      <SiteSettings
        hostname={activeSitePage}
        accountId={accountId}
        onDone={() => setActiveSitePage(null)}
      />
    )
  }
  return (
    <>
      <YStack gap="$5">
        <XStack alignItems="center" gap="$4">
          <Heading flex={1}>Sites</Heading>
          <Button
            size="$2"
            icon={Add}
            onPress={() => {
              setActiveSitePage(NewSitePage)
            }}
          >
            Add Site
          </Button>
        </XStack>

        <SitesList
          onSelectSite={(siteId: string) => setActiveSitePage(siteId)}
        />
      </YStack>
    </>
  )
}

function EmptySiteList() {
  return (
    <YStack padding="$4">
      <SizableText>no sites yet</SizableText>
    </YStack>
  )
}

function SiteItem({site, onSelect}: {site: SiteConfig; onSelect: () => void}) {
  return (
    <TableList.Item
      onPress={onSelect}
      iconAfter={Forward}
      hoverStyle={{cursor: 'pointer'}}
    >
      <SizableText hoverStyle={{cursor: 'pointer'}}>
        {hostnameStripProtocol(site.hostname)}
      </SizableText>
    </TableList.Item>
  )
}

function SitesList({onSelectSite}: {onSelectSite: (siteId: string) => void}) {
  const {data: sites, isLoading} = useSiteList()
  return (
    <TableList margin="$1">
      {isLoading && <Spinner />}
      {sites && sites.length === 0 && <EmptySiteList />}
      {sites?.map((site) => (
        <SiteItem
          key={site.hostname}
          site={site}
          onSelect={() => {
            onSelectSite(site.hostname)
          }}
        />
      ))}
    </TableList>
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
