import {TextField} from '@mintter/ui/text-field'
import type {ComponentMeta, ComponentStory} from '@storybook/react'
import {default as React, default as React} from 'react'
import {Button} from '../button'
import {Prompt as PromptComponent} from './prompt'

export default {
  title: 'Dialogs/Prompt',
  component: PromptComponent.Root,
} as ComponentMeta<typeof PromptComponent>

export const Prompt: ComponentStory<typeof PromptComponent> = (args) => (
  <PromptComponent.Root>
    <PromptComponent.Trigger>open prompt</PromptComponent.Trigger>
    <PromptComponent.Content>
      <PromptComponent.Title>Prompt Title</PromptComponent.Title>
      <PromptComponent.Description>You can add any form element here</PromptComponent.Description>
      <TextField
        as="textarea"
        rows={3}
        css={{
          minHeight: 150,
          maxHeight: 150,
          overflow: 'scroll',
        }}
      />
      <PromptComponent.Actions>
        <PromptComponent.Close asChild>
          <Button color="primary">close</Button>
        </PromptComponent.Close>
      </PromptComponent.Actions>
    </PromptComponent.Content>
  </PromptComponent.Root>
)
