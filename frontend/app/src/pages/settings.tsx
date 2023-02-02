import {createAuthService} from '@app/auth-machine'
import * as localApi from '@mintter/shared'
import {Box} from '@app/components/box'
import {Button} from '@app/components/button'
import {Text} from '@app/components/text'
import {TextField} from '@app/components/text-field'
import {
  useAddSite,
  useRemoveSite,
  useSiteInfo,
  useSiteList,
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
import {SiteConfig, SiteInfo} from '@mintter/shared'

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

function SiteInfoForm({
  info,
  onSubmit,
  onRemove,
}: {
  info: SiteInfo
  onSubmit: (s: Partial<SiteInfo>) => void
  onRemove: () => void
}) {
  const [title, setTitle] = useState(info.title)
  const [description, setDescription] = useState(info.description)
  return (
    <>
      <TextField
        id="site-title"
        name="site-title"
        label="Public Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <TextField
        id="site-description"
        name="site-description"
        label="Public Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      <TextField
        textarea
        id="site-editors"
        name="site-editors"
        label="Editors"
        rows={4}
      />
      <Box
        css={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Button color="danger" size="1" variant="outlined" onClick={onRemove}>
          Remove Site
        </Button>

        <Button
          size="2"
          color="success"
          onClick={() => {
            onSubmit({title, description})
          }}
        >
          Save Config
        </Button>
      </Box>
    </>
  )
}

function SiteSettings({siteId, onDone}: {siteId: string; onDone: () => void}) {
  const removeSite = useRemoveSite(siteId, {
    onSuccess: () => onDone(),
  })
  const siteInfo = useSiteInfo(siteId)
  const writeSiteInfo = useWriteSiteInfo(siteId)
  return (
    <>
      <SettingsNavBack title="Web Sites" onDone={onDone} />
      <h1>{siteId}</h1>
      {siteInfo?.data ? (
        <SiteInfoForm
          info={siteInfo.data}
          onSubmit={(info) => writeSiteInfo.mutate(info)}
          onRemove={() => removeSite.mutate()}
        />
      ) : null}
    </>
  )
}
function NewSite({onDone}: {onDone: (activeSite: string | null) => void}) {
  const addSite = useAddSite({
    onSuccess: (result, hostname) => onDone(hostname),
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
      {addSite.isLoading ? <div>loading...</div> : null}
      <SettingsNavBack title="Cancel" onDone={() => onDone(null)} />
      <h1>Add Site</h1>
      <p>Follow the self-hosting guide and copy the invite URL:</p>
      <Box
        as={'form'}
        onSubmit={(e) => {
          e.preventDefault()
          if (siteUrl) addSite.mutate(siteUrl)
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
        siteId={activeSitePage}
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
        New Site
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
