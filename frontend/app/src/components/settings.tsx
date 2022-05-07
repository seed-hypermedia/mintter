import * as localApi from '@app/client'
import {queryKeys, useAccount} from '@app/hooks'
import {styled} from '@app/stitches.config'
import {useTheme} from '@app/theme'
import {ObjectKeys} from '@app/utils/object-keys'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import {useActor} from '@xstate/react'
import {useEffect} from 'react'
import {useForm} from 'react-hook-form'
import toast from 'react-hot-toast'
import {useMutation, useQueryClient} from 'react-query'
import {Box} from './box'
import {Button} from './button'
import {PeerAddrs} from './peer-addrs'
import {ScrollArea} from './scroll-area'
import {Text} from './text'
import {TextField} from './text-field'
import {WalletList} from './wallet-list'

type ProfileInformationDataType = {
  alias: string
  email: string
  bio: string
}

type SettingsPageProp = {updateAccount?: typeof localApi.updateAccount}

export function Settings({
  updateAccount = localApi.updateAccount,
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
        <StyledTabsList aria-label="Manage your node">
          <TabTrigger value="profile">Profile</TabTrigger>
          <TabTrigger value="account">Account Info</TabTrigger>
          <TabTrigger value="wallets">Wallets</TabTrigger>
          <TabTrigger value="settings">Settings</TabTrigger>
        </StyledTabsList>
        <TabsContent value="profile">
          {/* <ScrollArea> */}
          <ProfileForm updateAccount={updateAccount} />
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
  width: 100,
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
  updateAccount,
}: {
  updateAccount: typeof localApi.updateAccount
}) {
  const {data, isSuccess} = useAccount('', {
    useErrorBoundary: true,
  })

  const queryClient = useQueryClient()
  const updateProfile = useMutation(updateAccount)

  const form = useForm<ProfileInformationDataType>({
    mode: 'onChange',
    defaultValues: {
      alias: '',
      email: '',
      bio: '',
    },
  })

  useEffect(() => {
    console.log('inside settings effect!', data?.profile)

    if (data?.profile && isSuccess) {
      const {alias = '', email = '', bio = ''} = data?.profile
      form.reset({
        alias,
        email,
        bio,
      })
    }
  }, [isSuccess])

  const onSubmit = form.handleSubmit(async (data) => {
    await toast
      .promise(updateProfile.mutateAsync(data), {
        loading: 'Updating profile',
        success: 'Profile updated',
        error: 'Error updating profile',
      })
      .finally(() => {
        queryClient.invalidateQueries(queryKeys.GET_ACCOUNT)
      })
  })
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
        ref={form.register}
        placeholder="Readable alias or username. Doesn't have to be unique."
      />
      <TextField
        type="email"
        status={form.errors.email && 'danger'}
        label="Email"
        id="email"
        name="email"
        data-testid="input-email"
        ref={form.register({
          // pattern: {
          //   // eslint-disable-next-line no-control-regex
          //   value: /[^@ \t\r\n]+@[^@ \t\r\n]+\.[^@ \t\r\n]+/,
          //   message: 'Please type a valid email.',
          // },
        })}
        placeholder="Real email that could be publically shared"
        hint={form.errors.email?.message}
      />

      <TextField
        textarea
        id="bio"
        name="bio"
        label="Bio"
        data-testid="input-bio"
        ref={form.register}
        rows={4}
        placeholder="A little bit about yourself..."
      />
      <Button
        type="submit"
        disabled={form.formState.isSubmitting || !form.formState.isValid}
        size="2"
        shape="pill"
        color="success"
        data-testid="submit"
        css={{alignSelf: 'flex-start'}}
      >
        Save
      </Button>
    </Box>
  )
}

function AccountInfo() {
  const {data} = useAccount()
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
      <Text
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
      </Text>
      <TextField
        readOnly
        type="text"
        label="Account ID"
        name="accountId"
        value={data?.id}
      />
      <PeerAddrs />
      <Text as="h4" size="6">
        Devices List
      </Text>
      <Box as="ul">
        {data?.devices && ObjectKeys(data?.devices).length
          ? Object.entries(data?.devices).map(
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
