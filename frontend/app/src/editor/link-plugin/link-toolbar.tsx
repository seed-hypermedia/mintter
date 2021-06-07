import { Button, Box, TextField, Icon, Text } from '@mintter/ui'
import * as Popover from '@radix-ui/react-popover'
import { Slot } from '@radix-ui/react-slot'
import { FormEvent, useEffect, useState } from 'react'
import {
  getAbove,
  getPreventDefaultHandler,
  isUrl,
  someNode,
  unwrapNodes,
} from '@udecode/slate-plugins-common'
import { SPEditor, useStoreEditorState } from '@udecode/slate-plugins-core'
import { ELEMENT_LINK } from './create-link-plugin'
import { Editor, Transforms } from 'slate'
import { upsertLinkAtSelection } from '@udecode/slate-plugins-link'
import { isValidUrl } from './is-valid-url'
export function ToolbarLink() {
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={nv => setOpen(nv)}>
      <Popover.Trigger as={Slot}>
        <Button
          variant="ghost"
          size="1"
          color="muted"
          onClick={() => {
            setOpen(pv => !pv)
          }}
        >
          <Icon name="Link" />
        </Button>
      </Popover.Trigger>
      <Popover.Content>
        <LinkForm close={() => setOpen(false)} />
      </Popover.Content>
    </Popover.Root>
  )
}

function LinkForm({ close }: { close: () => void }) {
  const [link, setLink] = useState('')
  const editor = useStoreEditorState('editor')
  const isLink =
    !!editor?.selection && someNode(editor, { match: { type: ELEMENT_LINK } })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor) return
    if (link && isValidUrl(link)) {
      Editor.withoutNormalizing(editor, () => {
        upsertLinkAtSelection(editor, { url: link, wrap: false })
      })
    }

    close()
  }

  function handleRemove() {
    if (!editor) return
    const linkNode = getAbove(editor, {
      match: n => n.type === ELEMENT_LINK,
    })
    if (linkNode) {
      const [link, path] = linkNode
      unwrapNodes(editor, {
        at: path,
        match: n => n.type === ELEMENT_LINK,
      })
    } else {
      console.log('linkNode DOES NOT exists ', linkNode)
    }
    close()
  }

  useEffect(() => {
    if (!editor) return
    const linkNode = getAbove(editor, {
      match: n => n.type === ELEMENT_LINK,
    })
    let link = ''
    if (linkNode) {
      link = linkNode[0].url as string
    }
    setLink(link)
  }, [editor?.selection])

  return (
    <Box
      css={{
        padding: '$5',
        width: '300px',
        backgroundColor: '$background-muted',
        display: 'flex',
        flexDirection: 'column',
        gap: '$4',
        boxShadow: '$3',
      }}
    >
      <Box
        as="form"
        onSubmit={handleSubmit}
        css={{
          width: '$full',
          display: 'flex',
          flexDirection: 'column',
          gap: '$5',
        }}
      >
        <Text size="5">Link Information</Text>
        <TextField
          type="url"
          id="address"
          name="address"
          label="Link Address"
          value={link}
          onChange={e => setLink(e.target.value)}
          size="1"
        />
        <Box
          css={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button type="submit">save</Button>
          <Button
            type="button"
            onClick={getPreventDefaultHandler(handleRemove)}
            disabled={!isLink}
            variant="outlined"
            color="danger"
            size="1"
          >
            <span>remove link</span>
          </Button>
        </Box>
      </Box>
    </Box>
  )
}
