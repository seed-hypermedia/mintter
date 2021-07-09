import {useEffect} from 'react'
import {useForm} from 'react-hook-form'
import toast from 'react-hot-toast'

import {updateAccount} from '@mintter/client'
import {useAccount} from '@mintter/client/hooks'
import {Box, Button, Text, TextField, useTheme} from '@mintter/ui'

import {Container} from '../components/container'
import {PeerAddrs} from '../components/peer-addrs'
import {PeerList} from '../components/peer-list'
import {Separator} from '../components/separator'
import Publication from '../pages/publication'

import {useMutation, useQueryClient} from 'react-query'

type ProfileInformationDataType = {
  alias: string
  email: string
  bio: string
}

export function Settings(): JSX.Element {
  const theme = useTheme()
  const account = useAccount()
  const queryClient = useQueryClient()
  const {data} = account

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
    if (data?.profile) {
      const {alias = '', email = '', bio = ''} = data?.profile
      form.setValue('alias', alias)
      form.setValue('email', email)
      form.setValue('bio', bio)
    }
  }, [data, form])

  const onSubmit = form.handleSubmit(async (data) => {
    await toast
      .promise(updateProfile.mutateAsync(data), {
        loading: 'Updating profile',
        success: 'Profile updated',
        error: 'Error updating profile',
      })
      .finally(() => {
        queryClient.invalidateQueries('Account')
      })

    console.log('edit complete!')
  })

  if (account.isLoading) {
    return <Text>loading...</Text>
  }

  if (account.isError) {
    console.error(account.error)
    return <Text>error!</Text>
  }

  return (
    <Box
      data-testid="page"
      css={{
        display: 'grid',
        minHeight: '$full',
        gridTemplateAreas: `"controls controls controls"
        "maincontent maincontent maincontent"`,
        gridTemplateColumns: 'minmax(350px, 25%) 1fr minmax(350px, 25%)',
        gridTemplateRows: '64px 1fr',
        gap: '$5',
      }}
    >
      <Container as="form" css={{gridArea: 'maincontent', marginBottom: 300}} onSubmit={onSubmit}>
        <Text as="h1" size="9">
          Settings
        </Text>
        <Box
          css={{
            display: 'flex',
            flexDirection: 'column',
            gap: '$7',
            marginTop: '$8',
          }}
        >
          <Text as="h2" size="8">
            Profile
          </Text>
          <TextField
            type="text"
            label="Username"
            id="alias"
            name="alias"
            ref={form.register}
            placeholder="Readable alias or alias. Doesn't have to be unique."
          />
          <TextField
            type="email"
            status={form.errors.email && 'danger'}
            label="Email"
            id="email"
            name="email"
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
            // TODO: fix types
            // @ts-ignore
            as="textarea"
            id="bio"
            name="bio"
            label="Bio"
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
            css={{alignSelf: 'flex-start'}}
          >
            Save
          </Button>
          <Separator />
          <Text as="h2" size="8">
            Account
          </Text>
          <Text
            size="2"
            color="primary"
            css={{
              paddingHorizontal: '$4',
              paddingVertical: '$3',
              borderRadius: '$2',
              display: 'block',
              background: '$primary-muted',
              border: '1px solid $colors$primary-softer',
            }}
          >
            All your Mintter content is located in <code>~/.mtt/</code>
          </Text>
          <TextField readOnly type="text" label="Account ID" name="accountId" value={data?.id} />
          <PeerAddrs />
          <Separator />
          <Text as="h2" size="8">
            Preferences
          </Text>
          <Box css={{alignItems: 'center', display: 'flex', gap: '$3'}}>
            <input id="darkMode" type="checkbox" checked={theme.currentTheme === 'dark'} onChange={theme.toggle} />
            <Text as="label" htmlFor="darkMode">
              Dark Mode
            </Text>
          </Box>
          <Separator />
          <Text as="h2" size="8">
            Devices List
          </Text>
          <Box css={{alignItems: 'center', display: 'flex', gap: '$3'}}>
            <PeerList />
          </Box>
        </Box>
      </Container>
    </Box>
  )
}
