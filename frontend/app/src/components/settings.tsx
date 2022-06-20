import {useAuthService} from '@app/auth-context'
import * as localApi from '@app/client'
import {styled} from '@app/stitches.config'
import {useTheme} from '@app/theme'
import {ObjectKeys} from '@app/utils/object-keys'
import {Separator} from '@components/separator'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import {useActor} from '@xstate/react'
import {FormEvent} from 'react'
import {Box} from './box'
import {Button} from './button'
import {PeerAddrs} from './peer-addrs'
import {ScrollArea} from './scroll-area'
import {Text} from './text'
import {TextField} from './text-field'
import {WalletList} from './wallet-list'

type SettingsPageProp = {updateProfile?: typeof localApi.updateProfile}

export function Settings({
  updateProfile = localApi.updateProfile,
}: SettingsPageProp) {
  return (
    <Box
      css={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',

        background: '$base-component-bg-normal',
      }}
    >
      <StyledTabs defaultValue="profile" orientation="horizontal">
        <StyledTabsList aria-label="Manage your node" data-tauri-drag-region>
          <TabTrigger value="profile">Profile</TabTrigger>
          <TabTrigger value="account">Account Info</TabTrigger>
          <TabTrigger value="wallets">Wallets</TabTrigger>
          <TabTrigger value="settings">Settings</TabTrigger>
        </StyledTabsList>
        <TabsContent value="profile">
          {/* <ScrollArea> */}
          <ProfileForm updateProfile={updateProfile} />
          {/* </ScrollArea> */}
        </TabsContent>
        <TabsContent value="account">
          {/* <ScrollArea> */}
          <AccountInfo />
          {/* </ScrollArea> */}
        </TabsContent>
        <TabsContent value="wallets">
          <ScrollArea>
            <WalletsInfo />
          </ScrollArea>
        </TabsContent>
        <TabsContent value="settings">
          <AppSettings />
        </TabsContent>
      </StyledTabs>
    </Box>
  )
}

var StyledTabs = styled(TabsPrimitive.Root, {
  width: '$full',
  height: '$full',
})

var StyledTabsList = styled(TabsPrimitive.List, {
  borderRight: '1px solid rgba(0,0,0,0.1)',

  display: 'flex',
  justifyContent: 'center',
})

var TabTrigger = styled(TabsPrimitive.Trigger, {
  all: 'unset',
  // padding: '0 $6',
  height: 45,
  textAlign: 'center',

  display: 'flex',
  alignItems: 'center',
  flex: 1,
  justifyContent: 'center',
  fontSize: '$3',
  fontFamily: '$base',
  lineHeight: '1',
  color: '$base-text-hight',
  '&:hover': {
    background: '$primary-component-bg-hover',
  },
  '&[data-state="active"]': {
    color: '$primary-normal',
    fontWeight: '$bold',
    // boxShadow: 'inset 0 -2px 0 0 currentColor, 0 2px 0 0 currentColor',
  },
  '&:focus': {position: 'relative', background: '$primary-component-bg-active'},
})

var TabsContent = styled(TabsPrimitive.Content, {
  flex: 1,
  position: 'relative',
  background: '$base-component-bg-normal',
})

function ProfileForm({
  updateProfile,
}: {
  updateProfile: typeof localApi.updateProfile
}) {
  let authService = useAuthService()
  let [state, send] = useActor(authService)

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    let formData = new FormData(e.currentTarget)
    // @ts-ignore
    let newProfile: localApi.Profile = Object.fromEntries(formData.entries())
    e.preventDefault()
    send({type: 'UPDATE.PROFILE', profile: newProfile})
  }

  if (state.context.account?.profile && state.matches('loggedIn')) {
    let {alias, bio, email} = state.context.account.profile
    return (
      <Box
        as="form"
        onSubmit={onSubmit}
        css={{
          display: 'flex',
          flexDirection: 'column',
          gap: '$7',
          padding: '$5',
          marginTop: '$8',
          marginBottom: '$8',
        }}
      >
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
          type="email"
          label="Email"
          id="email"
          name="email"
          data-testid="input-email"
          placeholder="Real email that could be publically shared"
          defaultValue={email}
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
            disabled={state.hasTag('pending')}
            size="2"
            shape="pill"
            color="success"
            data-testid="submit"
            css={{alignSelf: 'flex-start'}}
          >
            Save
          </Button>
          {state.matches('loggedIn.updateSuccess') && (
            <Text size="3" color="success">
              update success!
            </Text>
          )}
        </Box>
      </Box>
    )
  } else {
    return null
  }
}

function AccountInfo() {
  let authService = useAuthService()
  let [state, send] = useActor(authService)
  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$7',
        padding: '$5',
        marginTop: '$8',
        marginBottom: '$8',
      }}
    >
      {/* <Text
        size="2"
        color="primary"
        css={{
          paddingHorizontal: '$4',
          paddingVertical: '$3',
          borderRadius: '$2',
          display: 'block',
          background: '$primary-component-bg-normal',
          border: '1px solid $colors$primary-border-normal',
        }}
      >
        All your Mintter content is located in <code>~/.mtt/</code>
      </Text> */}
      <TextField
        readOnly
        type="text"
        label="Account ID"
        name="accountId"
        value={state.context.account?.id}
      />
      <PeerAddrs />
      <Separator data-orientation="horizontal" />
      <Text size="4">Devices List</Text>
      <Box
        as="ul"
        css={{
          margin: 0,
          padding: 0,
        }}
      >
        {state.context.account &&
        state.context.account.devices &&
        ObjectKeys(state.context.account.devices).length
          ? Object.entries(state.context.account.devices).map(
              ([id, device]: [string, localApi.Device], index: number) => (
                <Text as="li" key={id}>
                  <Text
                    as="span"
                    color="muted"
                    css={{display: 'inline-block', marginRight: '$4'}}
                  >
                    {index + 1}.
                  </Text>
                  {device.peerId}
                </Text>
              ),
            )
          : null}
      </Box>
      <Separator data-orientation="horizontal" />
    </Box>
  )
}

function AppSettings() {
  const themeService = useTheme()
  const [state, send] = useActor(themeService)
  return (
    <Box
      css={{
        alignItems: 'center',
        display: 'flex',
        gap: '$3',
        padding: '$5',
        marginTop: '$8',
        marginBottom: '$8',
      }}
    >
      <input
        id="darkMode"
        type="checkbox"
        checked={state.context.current == 'dark'}
        onChange={() => send('TOGGLE')}
      />
      <Text as="label" htmlFor="darkMode">
        Dark Mode
      </Text>
    </Box>
  )
}

function WalletsInfo() {
  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$7',
        padding: '$5',
        marginTop: '$8',
        marginBottom: '$8',
      }}
    >
      <WalletList />
    </Box>
  )
}
