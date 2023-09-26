import {Button, ButtonText, Form, Input, Text} from '@mintter/ui'
import {UseMutationResult} from '@tanstack/react-query'
import {ReactNode, useState} from 'react'
import {toast} from 'react-hot-toast'
import {usePublishGroupToSite} from '../models/groups'
import {DialogDescription, DialogTitle, useAppDialog} from './dialog'
import {useNavigate} from '../utils/useNavigate'

function FormWithError({
  mutator,
  onSubmit,
  children,
}: {
  mutator: UseMutationResult
  onSubmit: () => void
  children: ReactNode
}) {
  console.log(mutator.error)
  return (
    <Form onSubmit={onSubmit}>
      {mutator.error ? <Text>{mutator.error?.message} </Text> : null}
      {children}
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
  const spawn = useNavigate('spawn')
  let guidance = (
    <>
      <DialogDescription>
        Your group can be published to the web. You will need to set up a web
        server using our{' '}
        <ButtonText
          textDecorationLine="underline"
          onPress={() => {
            spawn({key: 'publication', documentId: '5rJPgXkzyHpyK6wQfbQgrC'})
          }}
        >
          self-hosting guide.
        </ButtonText>
      </DialogDescription>
    </>
  )
  if (input.publishedBaseUrl) {
    guidance = (
      <>
        <DialogDescription>
          Your site is published at:
          {input.publishedBaseUrl}
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
      <DialogTitle>Publish Group to Site</DialogTitle>
      {guidance}
      <FormWithError
        mutator={publishToSite}
        onSubmit={() => {
          publishToSite
            .mutateAsync({groupId: input.groupId, setupUrl})
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
