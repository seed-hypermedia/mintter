import {accountsClient, daemonClient} from '@app/api-clients'
import {createAuthService} from '@app/auth-machine'
import {Box} from '@app/components/box'
import {Button} from '@app/components/button'
import {Text} from '@app/components/text'
import {TextField} from '@app/components/text-field'
import {useAuthor} from '@app/hooks'
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
import {EXPERIMENTS} from '@app/utils/experimental'
import {
  NostrUserProfile,
  useAddRelay,
  useMyNostrProfile,
  useNostrKeypair,
  useNostrPublishProfile,
  useNostrRelayList,
  useRemoveRelay,
  useSetKeyPair,
} from '@app/utils/nostr'
import {ObjectKeys} from '@app/utils/object-keys'
import {hostnameStripProtocol} from '@app/utils/site-hostname'
import {Icon} from '@components/icon'
import {Prompt, StyledOverlay} from '@components/prompt'
import {Separator} from '@components/separator'
import {Input} from '@components/text-field'
import {AccessURLRow} from '@components/url'
import {Member_Role, Profile, SiteConfig, SiteInfo} from '@mintter/shared'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import {styled} from '@stitches/react'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {FormEvent, useEffect, useMemo, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {InterpreterFrom} from 'xstate'
import '../styles/settings.scss'

export default function Settings({
  updateProfile = accountsClient.updateProfile,
}: {
  updateProfile?: typeof accountsClient.updateProfile
}) {
  console.log('UPDATE PROFILE', updateProfile)
  const client = useQueryClient()
  const auth = useInterpret(() => createAuthService(client, updateProfile))
  return (
    <div className="settings-wrapper">
      <TabsPrimitive.Root
        className="tabs"
        defaultValue="profile"
        orientation="vertical"
      >
        <TabsPrimitive.List className="tabs-list" aria-label="Manage your node">
          <TabsPrimitive.Trigger
            className="tab-trigger"
            value="profile"
            data-testid="tab-profile"
          >
            Profile
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            className="tab-trigger"
            value="account"
            data-testid="tab-account"
          >
            Account Info
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            className="tab-trigger"
            value="settings"
            data-testid="tab-settings"
          >
            Settings
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            className="tab-trigger"
            value="sites"
            data-testid="tab-sites"
          >
            Web Sites
          </TabsPrimitive.Trigger>
          {EXPERIMENTS.nostr && (
            <TabsPrimitive.Trigger
              className="tab-trigger"
              value="nostr"
              data-testid="tab-nostr"
            >
              Nostr
            </TabsPrimitive.Trigger>
          )}
        </TabsPrimitive.List>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="profile"
        >
          <ProfileForm service={auth} updateProfile={updateProfile} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="account"
          data-tauri-drag-region
        >
          <AccountInfo service={auth} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="settings"
          data-tauri-drag-region
        >
          <AppSettings />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="sites"
          data-tauri-drag-region
        >
          <SitesSettings auth={auth} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="nostr"
          data-tauri-drag-region
        >
          <NostrSettings />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  )
}

type SettingsTabProps = {
  service: InterpreterFrom<ReturnType<typeof createAuthService>>
  updateProfile: typeof accountsClient.updateProfile
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
          <Button
            type="submit"
            disabled={isPending}
            size="2"
            shape="pill"
            color="success"
            data-testid="submit"
            css={{alignSelf: 'flex-start'}}
          >
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
      <div className="settings-tab-content">
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
        <Box
          css={{
            display: 'flex',
            gap: '$5',
            alignItems: 'center',
          }}
        >
          <Button
            variant="outlined"
            color="success"
            size="1"
            type="button"
            onClick={() => service.send('ACCOUNT.COPY.ADDRESS')}
          >
            Copy Address
          </Button>
          {onSuccess && (
            <Text size="3" color="success">
              copied!
            </Text>
          )}
        </Box>
        <Separator data-orientation="horizontal" />
        <Text size="3">Devices List</Text>
        <ol data-testid="account-device-list" className="account-device-list">
          {account.devices && ObjectKeys(account.devices).length
            ? Object.keys(account.devices).map((id) => (
                <li key={id}>
                  <p>...{id.slice(-40)}</p>
                </li>
              ))
            : null}
        </ol>
      </div>
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
    <div className="settings-tab-content">
      <Button size="1" variant="outlined" onClick={onReloadSync}>
        Reload Database
      </Button>
    </div>
  )
}

function SettingsNavBack({onDone, title}: {onDone: () => void; title: string}) {
  return (
    <Button onClick={onDone} className="settings-nav-button">
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
      <Button onClick={onDone}>Done</Button>
    </div>
  )
}
export function useInviteDialog(hostname: string) {
  const [isOpen, setIsOpen] = useState<null | string>(null)
  const invite = useInviteMember(hostname)

  function open() {
    invite.mutateAsync().then((inviteToken) => {
      setIsOpen(`https://${hostname}/invite/${inviteToken}`)
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
  member: localApi.Member
  hostname: string
  isOwner: boolean
}) {
  const {data: account} = useAuthor(member.accountId)
  const remove = useRemoveMember(hostname)
  return (
    <pre>
      {account?.profile?.alias || member.accountId} -{' '}
      {getNameOfRole(member.role)}
      {isOwner ? (
        <Button
          variant="outlined"
          color="danger"
          size="1"
          onClick={() => {
            remove.mutate(member.accountId)
          }}
        >
          Remove
        </Button>
      ) : null}
    </pre>
  )
}
function SiteMembers({
  hostname,
  accountId,
}: {
  hostname: string
  accountId: string
}) {
  const {content, open} = useInviteDialog(hostname)

  const {data: members} = useSiteMembers(hostname)
  const isOwner = useMemo(
    () =>
      !!members?.find(
        (member) =>
          member.accountId === accountId && member.role === Member_Role.OWNER,
      ),
    [members, accountId],
  )
  return (
    <SettingsSection title="Members">
      {members?.map((member) => (
        <SiteMemberRow
          key={member.accountId}
          member={member}
          isOwner={isOwner}
          hostname={hostname}
        />
      ))}
      {content}
      {isOwner ? (
        <Button
          type="button"
          size="2"
          data-testid="submit"
          onClick={open}
          css={{alignSelf: 'flex-start'}}
        >
          Invite Editor
        </Button>
      ) : null}
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
}: {
  info: SiteInfo
  onSubmit: (s: Partial<SiteInfo>) => void
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
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        textarea
        id="site-description"
        name="site-description"
        label="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <Button
        size="2"
        color="success"
        onClick={() => {
          onSubmit({title, description})
        }}
      >
        Save Site Info
      </Button>
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
  return (
    <>
      <SettingsHeader>
        <SettingsNavBack title="Web Sites" onDone={onDone} />
        <h2>{hostnameStripProtocol(hostname)}</h2>
      </SettingsHeader>

      <SiteInfoSection hostname={hostname} />
      <SiteMembers hostname={hostname} accountId={accountId} />
      <SiteAdmin hostname={hostname} onDone={onDone} />
    </>
  )
}

function SiteInfoSection({hostname}: {hostname: string}) {
  const siteInfo = useSiteInfo(hostname)
  const writeSiteInfo = useWriteSiteInfo(hostname)
  return (
    <SettingsSection title="Public SEO Info">
      {siteInfo?.data ? (
        <SiteInfoForm
          info={siteInfo.data}
          onSubmit={(info) => writeSiteInfo.mutate(info)}
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
        <Text color={'danger'}>{addSite.error?.message}</Text>
      ) : null}
      {addSite.isLoading ? <div>loading...</div> : null}
      <p>Follow the self-hosting guide and copy the invite URL:</p>
      <Box
        as={'form'}
        onSubmit={(e) => {
          e.preventDefault()
          const matchedHostProtocol = siteUrl?.match(
            /^(https?:\/\/)?([^/]*)\/?$/,
          )
          const matchedInviteURL = siteUrl?.match(
            /^(https?:\/\/)?([^/]*)(\/invite\/(.*))?$/,
          )
          const protocol = matchedHostProtocol?.[1] ?? 'https://'
          const hostname = matchedHostProtocol?.[2] || matchedInviteURL?.[2]
          const inviteToken = matchedInviteURL?.[4]
          const fullHostname = protocol + hostname
          console.log({fullHostname})
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
        <Button disabled={!siteUrl} size="2" color="success">
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
        type="button"
        size="2"
        shape="pill"
        color="success"
        data-testid="submit"
        onClick={() => {
          setActiveSitePage(NewSitePage)
        }}
        css={{alignSelf: 'flex-start'}}
      >
        Add Site
      </Button>
    </>
  )
}

function NostrPubKeyRow({pubId}: {pubId: string}) {
  return <AccessURLRow url={`nostr://${pubId}`} title={pubId} />
}
const VisibilityButton = styled('button', {
  background: 'white',
  position: 'absolute',
  border: '1px solid #fff',
  //   borderColor: props.active ? '$success-border-normal' : '$base-border-subtle',
  '&:hover': {
    borderColor: '$base-text-low',
  },
  variants: {
    active: {
      true: {
        borderColor: '$success-border-normal',
        color: '$success-border-normal',
        '&:hover': {
          borderColor: '$success-border-normal',
        },
      },
    },
  },
  right: 2,
  top: 0,
  bottom: 0,
  borderRadius: '$2',
  width: 36,
  cursor: 'pointer',
})
function PrivateField({value}: {value: string}) {
  const [isHiding, setIsHiding] = useState(true)
  return (
    <Box css={{position: 'relative'}}>
      <Input value={value} type={isHiding ? 'password' : 'text'}></Input>
      <VisibilityButton
        onClick={() => {
          setIsHiding((isH) => !isH)
        }}
      >
        <Icon name="Visibility" />
      </VisibilityButton>
    </Box>
  )
}

function ResetNostrIdForm({onDone}: {onDone: () => void}) {
  const setKeyPair = useSetKeyPair({
    onSuccess: onDone,
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.nativeEvent.target)
        const key = formData.get('secret_key')?.toString() ?? ''
        setKeyPair.mutate(key)
      }}
    >
      {setKeyPair.error && (
        <Text color="danger">{setKeyPair.error.message}</Text>
      )}
      <TextField name="secret_key" label="Nostr Secret Key" />
      <Button type="submit">Set Private Key & Identity</Button>
    </form>
  )
}

export function useResetNostrIdDialog() {
  const [isOpen, setIsOpen] = useState(false)

  function open() {
    setIsOpen(true)
  }
  return {
    content: (
      <DialogPrimitive.Root open={!!isOpen} onOpenChange={setIsOpen}>
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <Prompt.Content>
            <Prompt.Title>Reset Nostr Identity</Prompt.Title>

            <ResetNostrIdForm onDone={() => setIsOpen(false)} />
          </Prompt.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    ),
    open,
  }
}

function ResetNostrIdentityButton() {
  const {open, content} = useResetNostrIdDialog()
  return (
    <>
      {content}
      <Button
        type="button"
        size="2"
        shape="pill"
        color="success"
        data-testid="submit"
        onClick={open}
        css={{alignSelf: 'flex-start'}}
      >
        Reset Nostr Identity
      </Button>
    </>
  )
}

function NostrInfo() {
  const keyPair = useNostrKeypair()
  return (
    <SettingsSection title="Key & Identity">
      <Box css={{marginBottom: '$2'}}>
        <Text>Private Key</Text>
        {keyPair.data && <PrivateField value={keyPair.data?.sec} />}
      </Box>
      <Box css={{marginBottom: '$2'}}>
        <Text>Public Key</Text>
        {keyPair.data && <NostrPubKeyRow pubId={keyPair.data?.pub} />}
      </Box>
      <ResetNostrIdentityButton />
    </SettingsSection>
  )
}

function AddRelayForm({onDone}: {onDone: () => void}) {
  const addRelay = useAddRelay({
    onSuccess: onDone,
  })
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.nativeEvent.target)
        const url = formData.get('relay-url')?.toString() ?? ''
        addRelay.mutate(url)
      }}
    >
      {addRelay.error && <Text color="danger">{addRelay.error.message}</Text>}
      <TextField name="relay-url" label="Nostr Relay URL" />
      <Button type="submit">Create Relay</Button>
    </form>
  )
}

export function useAddRelayDialog() {
  const [isOpen, setIsOpen] = useState(false)

  function open() {
    setIsOpen(true)
  }
  return {
    content: (
      <DialogPrimitive.Root open={!!isOpen} onOpenChange={setIsOpen}>
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <Prompt.Content>
            <Prompt.Title>Add a Nostr Relay</Prompt.Title>
            <Prompt.Description>
              Enter the URL of your nostr relay, beginning with wss://
            </Prompt.Description>
            <AddRelayForm onDone={() => setIsOpen(false)} />
          </Prompt.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    ),
    open,
  }
}

function AddRelayButton() {
  const {open, content} = useAddRelayDialog()
  return (
    <>
      {content}
      <Button
        type="button"
        size="2"
        shape="pill"
        color="success"
        data-testid="submit"
        onClick={open}
        css={{alignSelf: 'flex-start'}}
      >
        Add Relay
      </Button>
    </>
  )
}
function RemoveRelayButton({relay}: {relay: string}) {
  const removeRelay = useRemoveRelay()
  return (
    <Button
      color="danger"
      variant="outlined"
      size="1"
      onClick={() => {
        removeRelay.mutate(relay)
      }}
    >
      Remove
    </Button>
  )
}
function NostrRelays() {
  const {data} = useNostrRelayList()
  const addRelay = useAddRelay()
  return (
    <SettingsSection title="Relays">
      {data?.length ? (
        data.map((relay) => (
          <div key={relay}>
            {relay}
            <RemoveRelayButton relay={relay} />
          </div>
        ))
      ) : (
        <div>No relays?!</div>
      )}
      <AddRelayButton />
    </SettingsSection>
  )
}

function NostrProfileForm({
  profile,
  onDone,
}: {
  onDone: () => void
  profile: NostrUserProfile
}) {
  const publishProfile = useNostrPublishProfile()

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        const formData = new FormData(e.target)
        publishProfile
          .mutateAsync({
            ...(profile || {}),
            display_name: formData.get('display_name')?.toString() || '',
            about: formData.get('about')?.toString() || '',
          })
          .then(() => {
            onDone()
          })
          .catch((e) => {
            console.error('Failed to publish profile', e)
            toast.error('Failed to publish profile')
          })
      }}
    >
      <TextField
        name="display_name"
        label="Display Name"
        defaultValue={profile.display_name}
      />
      <TextField
        name="about"
        label="About"
        textarea
        defaultValue={profile.about}
      />
      <Button type="submit">Publish Profile Changes</Button>
    </form>
  )
}

export function useChangeProfileDialog() {
  const [openProfile, setOpenProfile] = useState<false | NostrUserProfile>(
    false,
  )

  function open(profile: NostrUserProfile) {
    setOpenProfile(profile)
  }
  return {
    content: (
      <DialogPrimitive.Root
        open={!!openProfile}
        onOpenChange={() => setOpenProfile(false)}
      >
        <DialogPrimitive.Portal>
          <StyledOverlay />
          <Prompt.Content>
            <Prompt.Title>Edit Nostr Profile</Prompt.Title>
            {openProfile && (
              <NostrProfileForm
                profile={openProfile}
                onDone={() => setOpenProfile(false)}
              />
            )}
          </Prompt.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    ),
    open,
  }
}
function ChangeProfileButton({profile}: {profile?: NostrUserProfile}) {
  const {open, content} = useChangeProfileDialog()
  return (
    <>
      {content}
      <Button
        type="button"
        size="2"
        onClick={() => {
          if (!profile) throw new Error('profile not loaded yet')
          open(profile)
        }}
        css={{alignSelf: 'flex-start'}}
      >
        Edit Profile
      </Button>
    </>
  )
}

function EmptySiteList() {
  return <div>no sites yet</div>
}

function SiteItem({site, onSelect}: {site: SiteConfig; onSelect: () => void}) {
  return (
    <Button className="settings-list-item" onClick={onSelect}>
      {hostnameStripProtocol(site.hostname)}
    </Button>
  )
}

function SiteAdmin({hostname, onDone}: {hostname: string; onDone: () => void}) {
  const removeSite = useRemoveSite(hostname, {
    onSuccess: () => onDone(),
  })
  return (
    <SettingsSection>
      <Button
        color="danger"
        size="1"
        variant="outlined"
        onClick={() => removeSite.mutate()}
      >
        Remove Site
      </Button>
    </SettingsSection>
  )
}

function SitesList({onSelectSite}: {onSelectSite: (siteId: string) => void}) {
  const {data: sites, isLoading} = useSiteList()
  return (
    <>
      {isLoading && <div>loading...</div>}
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

function NostrProfile() {
  const profile = useMyNostrProfile()
  return (
    <SettingsSection title="Public Profile">
      <Text css={{fontWeight: 'bold'}}>Display Name</Text>
      <Text>{profile.data?.display_name}</Text>
      <Text css={{fontWeight: 'bold'}}>About</Text>
      <Text>{profile.data?.about}</Text>
      <ChangeProfileButton profile={profile.data} />
    </SettingsSection>
  )
}

function NostrSettings() {
  return (
    <>
      <SettingsHeader>
        <h2>Nostr</h2>
      </SettingsHeader>
      <NostrProfile />
      <NostrInfo />
      <NostrRelays />
    </>
  )
}
