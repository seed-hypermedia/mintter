import type {ComponentMeta, ComponentStory} from '@storybook/react'
import React from 'react'
import {Alert as AlertComponent} from './alert'

export default {
  title: 'Dialogs/Alert',
  component: AlertComponent.Root,
} as ComponentMeta<typeof AlertComponent>

export const Alert: ComponentStory<typeof AlertComponent> = (args) => (
  <AlertComponent.Root>
    <AlertComponent.Trigger>open alert</AlertComponent.Trigger>
    <AlertComponent.Content>
      <AlertComponent.Title>Alert Title</AlertComponent.Title>
      <AlertComponent.Description>
        Are you sure you want to delete this document? This action is not reversible.
      </AlertComponent.Description>
      <AlertComponent.Actions>
        <AlertComponent.Cancel>Cancel</AlertComponent.Cancel>
        <AlertComponent.Action>Action</AlertComponent.Action>
      </AlertComponent.Actions>
    </AlertComponent.Content>
  </AlertComponent.Root>
)
