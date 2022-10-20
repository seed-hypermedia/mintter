import {createAuthService} from '@app/auth-machine'
import * as localApi from '@app/client'
import {updateProfile as apiUpdateProfile} from '@app/client'
import {forceSync} from '@app/client/daemon'
import {Box} from '@app/components/box'
import {Button} from '@app/components/button'
import {Text} from '@app/components/text'
import {TextField} from '@app/components/text-field'
import {ObjectKeys} from '@app/utils/object-keys'
import {Separator} from '@components/separator'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import {useQueryClient} from '@tanstack/react-query'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import {FormEvent} from 'react'
import toast from 'react-hot-toast'
import {InterpreterFrom} from 'xstate'
import '../styles/settings.scss'

export default function Settings({
  updateProfile = apiUpdateProfile,
}: {
  updateProfile?: typeof apiUpdateProfile
}) {
  const client = useQueryClient()
  const auth = useInterpret(() => createAuthService(client, updateProfile))
  return (
    <div className="settings-wrapper">
      <div className="drag-handle" data-tauri-drag-region></div>
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
    await forceSync()
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
        Reload Database Sync
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
