import {useOpenUrl} from '@mintter/desktop/src/open-url'
import {
  Button,
  ButtonText,
  Form,
  Input,
  SizableText,
  Spinner,
  YStack,
  toast,
} from '@mintter/ui'
import {UseMutationResult} from '@tanstack/react-query'
import {ReactNode, useState} from 'react'
import {usePublishGroupToSite} from '../models/groups'
import {useNavigate} from '../utils/useNavigate'
import {DialogDescription, DialogTitle, useAppDialog} from './dialog'

function ErrorBox({children}: {children: ReactNode}) {
  return (
    <YStack
      backgroundColor="$red4"
      borderColor="$red9"
      padding="$4"
      borderRadius="$4"
      borderWidth={1}
      marginVertical="$4"
    >
      <SizableText color="$red9">{children}</SizableText>
    </YStack>
  )
}
function FormWithError({
  mutator,
  onSubmit,
  children,
}: {
  mutator: UseMutationResult
  onSubmit: () => void
  children: ReactNode
}) {
  return (
    <Form onSubmit={onSubmit} marginTop="$5" position="relative">
      {mutator.error ? <ErrorBox>{mutator.error?.message}</ErrorBox> : null}
      {children}

      {mutator.isLoading ? (
        <Spinner
          position="absolute"
          top={-32} // spin now, regret layout choices later.
          right={0}
        />
      ) : null}
    </Form>
  )
}

function PublishGroupDialog({
  input,
  onClose,
}: {
  input: {groupId: string; publishedBaseUrl?: string}
  onClose: () => void
}) {
  const [setupUrl, setSetupUrl] = useState('')
  const publishToSite = usePublishGroupToSite()
  const open = useOpenUrl()
  const spawn = useNavigate('spawn')
  let guidance = (
    <>
      <DialogDescription>
        Your group can be published to the web. You will need to set up a web
        server using our self-hosting guide
        {/* <ButtonText // todo, fix this and include a valid group variant
          textDecorationLine="underline"
          onPress={() => {
            spawn({
              key: 'publication',
              documentId: 'hm://d/3Kuk9GFL5LpXL4zsP5NBZd',
            })
          }}
        >
          self-hosting guide.
        </ButtonText> */}
      </DialogDescription>
    </>
  )
  if (input.publishedBaseUrl) {
    guidance = (
      <>
        <DialogDescription>
          Your site is published at:{' '}
          <ButtonText
            textDecorationLine="underline"
            onPress={() => {
              open(input.publishedBaseUrl)
            }}
          >
            {input.publishedBaseUrl}
          </ButtonText>
        </DialogDescription>
        <DialogDescription>
          You may re-publish your group to a different site by entering a new
          setup URL, or you may set up the same site again.
        </DialogDescription>
      </>
    )
  }
  return (
    <>
      <DialogTitle>
        <SizableText size="$5" fontWeight="bold">
          Publish Group to Site
        </SizableText>
      </DialogTitle>
      {guidance}
      <FormWithError
        mutator={publishToSite}
        onSubmit={() => {
          publishToSite
            .mutateAsync({
              groupId: input.groupId,
              setupUrl,
            })
            .then(() => {
              onClose()
              toast.success('Published group to site, congrats!')
            })
        }}
      >
        <Input
          value={setupUrl}
          onChangeText={setSetupUrl}
          placeholder="Secret Setup URL"
        />
        <Form.Trigger asChild>
          <Button>Create Site</Button>
        </Form.Trigger>
      </FormWithError>
    </>
  )
}

export function usePublishGroupDialog() {
  return useAppDialog<{groupId: string; publishedBaseUrl?: string}>(
    PublishGroupDialog,
  )
}
