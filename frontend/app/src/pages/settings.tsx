import {createAuthService} from '@app/auth-machine'
import * as localApi from '@mintter/shared'
import {Box} from '@app/components/box'
import {Button} from '@app/components/button'
import {Text} from '@app/components/text'
import {TextField} from '@app/components/text-field'
import {
  useAddSite,
  useInviteMember,
  useRemoveSite,
  useSiteInfo,
  useSiteList,
  useSiteMembers,
  useWriteSiteInfo,
} from '@app/hooks/sites'
import {ObjectKeys} from '@app/utils/object-keys'
import {Icon} from '@components/icon'
import {Separator} from '@components/separator'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {FormEvent, useEffect, useRef, useState} from 'react'
import toast from 'react-hot-toast'
import {InterpreterFrom} from 'xstate'
import '../styles/settings.scss'
import {Member_Role, SiteConfig, SiteInfo} from '@mintter/shared'
import {styled} from '@stitches/react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import {dialogContentStyles, overlayStyles} from '@components/dialog-styles'
import {StyledOverlay, Prompt} from '@components/prompt'
import {AccessURLRow} from '@components/url'

// const StyledContent = styled(DialogPrimitive.Content, dialogContentStyles)
// const StyledOverlay = styled(DialogPrimitive.Overlay, overlayStyles)

export default function Settings({
  updateProfile = localApi.updateProfile,
}: {
  updateProfile?: typeof localApi.updateProfile
}) {
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
            value="wallets"
            data-testid="tab-wallets"
          >
            Wallets
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
            value="verified-accounts"
            data-testid="tab-verified-accounts"
          >
            Verified Accounts
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger
            className="tab-trigger"
            value="sites"
            data-testid="tab-sites"
          >
            Web Sites
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="profile"
        >
          <ProfileForm service={auth} />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="account"
          data-tauri-drag-region
        >
          {/* <ScrollArea> */}
          <AccountInfo service={auth} />
          {/* </ScrollArea> */}
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="wallets"
          data-tauri-drag-region
        >
          <ComingSoon />
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
          value="verified-accounts"
          data-tauri-drag-region
        >
          <ComingSoon />
        </TabsPrimitive.Content>
        <TabsPrimitive.Content
          className="settings-tab-content tab-content"
          value="sites"
          data-tauri-drag-region
        >
          <SitesSettings />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  )
}

type SettingsTabProps = {
  service: InterpreterFrom<ReturnType<typeof createAuthService>>
}

export function ProfileForm({service}: SettingsTabProps) {
  let [state, send] = useActor(service)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    let formData = new FormData(e.currentTarget)
    // @ts-ignore
    let newProfile: localApi.Profile = Object.fromEntries(formData.entries())
    e.preventDefault()
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
  // let activityService = useActivity()

  async function onReloadSync() {
    toast.success('reload sync successful!')
  }

  return (
    <div className="settings-tab-content">
      <Button
        color="danger"
        size="1"
        variant="outlined"
        onClick={(e) => {
          e.preventDefault()
          // activityService?.send('RESET')
        }}
      >
        Reset Activity
      </Button>
      <Button size="1" variant="outlined" onClick={onReloadSync}>
        Reload Database localApi.updateProfile
      </Button>
    </div>
  )
}

function ComingSoon() {
  return (
    <div className="settings-tab-content">
      <code>coming soon!</code>
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

function SiteMembers({hostname}: {hostname: string}) {
  const {content, open} = useInviteDialog(hostname)
  const {data: members} = useSiteMembers(hostname)
  return (
    <>
      {members?.map((member) => (
        <div key={member.accountId}>
          {member.accountId} - {getNameOfRole(member.role)}
        </div>
      ))}
      {content}
      <SettingsSection title="Members">
        <Button
          type="button"
          size="2"
          data-testid="submit"
          onClick={open}
          css={{alignSelf: 'flex-start'}}
        >
          Invite Editor
        </Button>
      </SettingsSection>
    </>
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
}: {
  hostname: string
  onDone: () => void
}) {
  return (
    <>
      <SettingsHeader>
        <SettingsNavBack title="Web Sites" onDone={onDone} />
        <h2>{hostname}</h2>
      </SettingsHeader>

      <SiteInfoSection hostname={hostname} />
      <SiteMembers hostname={hostname} />
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
          const matchedURL = siteUrl?.match(
            /^(https:\/\/)?([^/]*)(\/invite\/(.*))?$/,
          )
          const hostname = matchedURL?.[2]
          const inviteToken = matchedURL?.[4]
          if (hostname) addSite.mutate({hostname, inviteToken})
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
function SitesSettings() {
  const [activeSitePage, setActiveSitePage] = useState<
    string | typeof NewSitePage | null
  >(null)

  if (activeSitePage === NewSitePage) {
    return <NewSite onDone={(s: string | null) => setActiveSitePage(s)} />
  }
  if (typeof activeSitePage === 'string') {
    return (
      <SiteSettings
        hostname={activeSitePage}
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

function EmptySiteList() {
  return <div>no sites yet</div>
}

function SiteItem({site, onSelect}: {site: SiteConfig; onSelect: () => void}) {
  return (
    <Button className="settings-list-item" onClick={onSelect}>
      {site.hostname}
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
