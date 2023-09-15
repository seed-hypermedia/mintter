import {Button, Form, Input, Text} from '@mintter/ui'
import {DialogTitle, DialogDescription, useAppDialog} from './dialog'
import React, {ReactNode, useState} from 'react'
import {usePublishGroupToSite} from '../models/groups'
import {toast} from 'react-hot-toast'
import {UseMutationResult} from '@tanstack/react-query'

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
  input: {groupId: string}
  onClose: () => void
}) {
  const [setupUrl, setSetupUrl] = useState('')
  const publishToSite = usePublishGroupToSite()
  return (
    <>
      <DialogTitle>Publish Group to Site</DialogTitle>
      <DialogDescription>Coming soon.</DialogDescription>

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
  return useAppDialog<{groupId: string}>(PublishGroupDialog)
}
