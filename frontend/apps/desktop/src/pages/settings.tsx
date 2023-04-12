import {accountsClient, daemonClient} from '@app/api-clients'
import {createAuthService} from '@app/auth-machine'
import {Box} from '@app/components/box'
import {Text} from '@app/components/text'
import {TextField} from '@app/components/text-field'
import {useAccount} from '@app/hooks'
import {
  useAddSite,
  useInviteMember,
  useRemoveMember,
  useRemoveSite,
  useSiteInfo,
  useSiteList,
  useSiteMembers,
  useWriteSiteInfo,
} from '@app/hooks/sites'
import {ObjectKeys} from '@app/utils/object-keys'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Icon} from '@components/icon'
import {Prompt, StyledOverlay} from '@components/prompt'
import {AccessURLRow} from '@components/url'
import {
  Member,
  Member_Role,
  Profile,
  SiteConfig,
  SiteInfo,
} from '@mintter/shared'
import {
  Button,
  Separator,
  SizableText,
  Spinner,
  Tabs,
  TabsContentProps,
  XStack,
  YStack,
} from '@mintter/ui'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {styled} from '@stitches/react'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {FormEvent, useEffect, useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {InterpreterFrom} from 'xstate'

export default function Settings({
  updateProfile = accountsClient.updateProfile,
}: {
  updateProfile?: typeof accountsClient.updateProfile
}) {
  const client = useQueryClient()
  const auth = useInterpret(() => createAuthService(client))

  return (
    <Tabs
      theme="gray"
      height="100%"
      defaultValue="profile"
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
      >
        <Tabs.Tab value="profile" data-testid="tab-profile">
          <SizableText>Profile</SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="account" data-testid="tab-account">
          <SizableText>Account Info</SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="settings" data-testid="tab-settings">
          <SizableText>Settings</SizableText>
        </Tabs.Tab>
        <Tabs.Tab value="sites" data-testid="tab-sites">
          <SizableText>Web Sites</SizableText>
        </Tabs.Tab>
      </Tabs.List>
      <Separator vertical />
      <TabsContent className="settings-tab-content tab-content" value="profile">
        <ProfileForm service={auth} updateProfile={updateProfile} />
      </TabsContent>
      <TabsContent
        className="settings-tab-content tab-content"
        value="account"
        data-tauri-drag-region
      >
        <AccountInfo service={auth} />
      </TabsContent>
      <TabsContent
        className="settings-tab-content tab-content"
        value="settings"
        data-tauri-drag-region
      >
        <AppSettings />
      </TabsContent>
      <TabsContent
        className="settings-tab-content tab-content"
        value="sites"
        data-tauri-drag-region
      >
        <SitesSettings auth={auth} />
      </TabsContent>
    </Tabs>
  )
}

type SettingsTabProps = {
  service: InterpreterFrom<ReturnType<typeof createAuthService>>
  updateProfile?: typeof accountsClient.updateProfile
}

export function ProfileForm({service, updateProfile}: SettingsTabProps) {
  let [state, send] = useActor(service)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    let formData = new FormData(e.currentTarget)
    // @ts-ignore
    let newProfile: Profile = Object.fromEntries(formData.entries())
    e.preventDefault()
    updateProfile?.(newProfile)
    send({type: 'ACCOUNT.UPDATE.PROFILE', profile: newProfile})
  }

  let isPending = useSelector(service, (state) =>
    state.matches('loggedIn.updating'),
  )
  let onSuccess = useSelector(service, (state) =>
    state.matches('loggedIn.onSuccess'),
  )

  if (state.context.account?.profile && state.matches('loggedIn')) {
    let {alias, bio} = state.context.account.profile

    return (
      <form onSubmit={onSubmit} className="settings-tab-content">
        <TextField
          type="text"
          label="Alias"
          data-testid="input-alias"
          id="alias"
          name="alias"
          defaultValue={alias}
          placeholder="Readable alias or username. Doesn't have to be unique."
        />

        <TextField
          textarea
          id="bio"
          name="bio"
          label="Bio"
          data-testid="input-bio"
          defaultValue={bio}
          rows={4}
          placeholder="A little bit about yourself..."
        />
        <Box
          css={{
            display: 'flex',
            gap: '$5',
            alignItems: 'center',
          }}
        >
          <Button disabled={isPending} size="$2">
            Save
          </Button>
          {onSuccess && (
            <Text size="3" color="success">
              update success!
            </Text>
          )}
        </Box>
      </form>
    )
  }

  return null
}

export function AccountInfo({service}: SettingsTabProps) {
  let [state] = useActor(service)
  let account = useSelector(service, (state) => state.context.account)
  let onSuccess = useSelector(service, (state) =>
    state.matches('loggedIn.onSuccess'),
  )
  const peerAddrs = useSelector(service, (state) => state.context.peerAddrs)

  if (account && state.matches('loggedIn')) {
    return (
      <>
        <TextField
          readOnly
          type="text"
          label="Account ID"
          name="accountId"
          value={account.id}
          data-testid="account-id"
          css={{fontFamily: 'monospace'}}
        />

        <TextField
          readOnly
          textarea
          id="addresses"
          name="addresses"
          label="Your Mintter address"
          rows={4}
          value={peerAddrs}
          data-testid="account-addresses"
          css={{fontFamily: 'monospace', userSelect: 'none'}}
        />
        <XStack>
          <Button
            theme="green"
            onPress={() => service.send('ACCOUNT.COPY.ADDRESS')}
          >
            Copy Address
          </Button>
          {onSuccess && (
            <SizableText size="$2" color="green">
              copied!
            </SizableText>
          )}
        </XStack>
        <Separator />
        <Text size="3">Devices List</Text>
        <YStack data-testid="account-device-list">
          {account.devices && ObjectKeys(account.devices).length
            ? Object.keys(account.devices).map((id) => (
                <XStack tag="li" key={id}>
                  <SizableText>...{id.slice(-40)}</SizableText>
                </XStack>
              ))
            : null}
        </YStack>
      </>
    )
  }

  return null
}

function AppSettings() {
  async function onReloadSync() {
    await daemonClient.forceSync({})
    toast.success('reload sync successful!')
  }

  return (
    <>
      <Button onPress={onReloadSync}>Reload Database</Button>
    </>
  )
}

function SettingsNavBack({onDone, title}: {onDone: () => void; title: string}) {
  return (
    <Button onPress={onDone}>
      <Icon name="ArrowChevronLeft" size="2" color="muted" />
      <span style={{marginLeft: '0.3em'}}>{title}</span>
    </Button>
  )
}
function InviteMemberDialog({url, onDone}: {url: string; onDone: () => void}) {
  return (
    <div>
      <p>Copy and send this secret editor invite URL</p>
      {url && <AccessURLRow url={url} title={url} enableLink={false} />}
      <Button onPress={onDone}>Done</Button>
    </div>
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
      <DialogPrimitive.Root
        open={!!isOpen}
        onOpenChange={() => setIsOpen(null)}
      >
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <Prompt.Content>
            {isOpen && (
              <InviteMemberDialog url={isOpen} onDone={() => setIsOpen(null)} />
            )}
          </Prompt.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
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
  return (
    <Box
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      css={{
        backgroundColor: '$base-background-normal',
        borderRadius: '$2',
        display: 'flex',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Text
        css={{
          display: 'flex',
          textOverflow: 'ellipsis',
          margin: '$3',
          flex: 1,
          fontWeight: member.role === Member_Role.OWNER ? 'bold' : 'normal',
        }}
      >
        {account?.profile?.alias || member.accountId}
        {member.role === Member_Role.OWNER ? '[Owner]' : ''}
      </Text>
      {hovering && isOwner && member.accountId !== account?.id ? (
        <Button
          color="red"
          size="$1"
          onPress={() => {
            remove.mutate(member.accountId)
          }}
        >
          Remove
        </Button>
      ) : null}
    </Box>
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
    <SettingsSection title="Members">
      <Box css={{display: 'flex', gap: '$3', flexDirection: 'column'}}>
        {members?.map((member) => (
          <SiteMemberRow
            key={member.accountId}
            member={member}
            isOwner={isOwner}
            hostname={hostname}
          />
        ))}
      </Box>
      {content}
      {isOwner ? <Button onPress={open}>Invite Editor</Button> : null}
    </SettingsSection>
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
    <Box
      css={{
        borderTop: '1px solid blue',
        borderColor: '$base-border-subtle',
        paddingTop: '$5',
        paddingBottom: '$5',
      }}
    >
      <h3>{title}</h3>
      {children}
    </Box>
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
    <>
      <TextField
        id="site-title"
        name="site-title"
        label="Title"
        value={title}
        disabled={!isOwner}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        textarea
        id="site-description"
        name="site-description"
        label="Description"
        value={description}
        disabled={!isOwner}
        onChange={(e) => setDescription(e.target.value)}
      />
      {isOwner ? (
        <Button
          size="$2"
          color="success"
          onPress={() => {
            onSubmit({title, description})
          }}
        >
          Save Site Info
        </Button>
      ) : null}
      {/* <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
       
      </Box> */}
    </>
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

  return (
    <>
      <SettingsHeader>
        <SettingsNavBack title="Web Sites" onDone={onDone} />
        <h2>{hostnameStripProtocol(hostname)}</h2>
      </SettingsHeader>
      {isLoading ? (
        <span>Loading</span>
      ) : (
        <>
          <SiteInfoSection hostname={hostname} isOwner={isOwner} />
          <SiteMembers
            hostname={hostname}
            accountId={accountId}
            isOwner={isOwner}
          />
          <SiteAdmin hostname={hostname} onDone={onDone} />
        </>
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
        <SiteInfoForm
          info={siteInfo.data}
          onSubmit={(info) => writeSiteInfo.mutate(info)}
          isOwner={isOwner}
        />
      ) : null}
    </SettingsSection>
  )
}

const SettingsHeader = styled('div', {
  display: 'flex',
  gap: '1rem',
  position: 'relative',
  '>h2': {
    flexGrow: 1,
    margin: 0,
    fontSize: '1.5em',
  },
})

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
      <SettingsHeader>
        <SettingsNavBack title="Cancel" onDone={() => onDone(null)} />
        <h2>Add Mintter Web Site</h2>
      </SettingsHeader>

      {addSite.error ? (
        //@ts-ignore
        <Text color={'danger'}>{addSite.error?.message}</Text>
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
        <TextField
          ref={hostRef}
          id="host"
          name="host"
          label="site domain or invite url"
          onChange={(e) => setSiteUrl(e.target.value)}
          value={siteUrl ?? undefined}
        />
        <Button disabled={!siteUrl} size="$2" color="green">
          Connect + Add Site
        </Button>
      </Box>
    </>
  )
}

const NewSitePage = Symbol('NewSitePage')
function SitesSettings({
  auth,
}: {
  auth: InterpreterFrom<ReturnType<typeof createAuthService>>
}) {
  let account = useSelector(auth, (state) => state.context.account)
  let [state] = useActor(auth)
  const accountId = state.matches('loggedIn') ? account?.id : undefined
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
      <SitesList onSelectSite={(siteId: string) => setActiveSitePage(siteId)} />
      <Button
        size="$2"
        onPress={() => {
          setActiveSitePage(NewSitePage)
        }}
      >
        Add Site
      </Button>
    </>
  )
}

function EmptySiteList() {
  return <div>no sites yet</div>
}

function SiteItem({site, onSelect}: {site: SiteConfig; onSelect: () => void}) {
  return (
    <Button onPress={onSelect}>{hostnameStripProtocol(site.hostname)}</Button>
  )
}

function SiteAdmin({hostname, onDone}: {hostname: string; onDone: () => void}) {
  const removeSite = useRemoveSite(hostname, {
    onSuccess: () => onDone(),
  })
  return (
    <SettingsSection>
      <Button color="red" size="$1" onPress={() => removeSite.mutate()}>
        Remove Site
      </Button>
    </SettingsSection>
  )
}

function SitesList({onSelectSite}: {onSelectSite: (siteId: string) => void}) {
  const {data: sites, isLoading} = useSiteList()
  return (
    <>
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
    </>
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
      <YStack gap="$3" padding="$4">
        {props.children}
      </YStack>
    </Tabs.Content>
  )
}
