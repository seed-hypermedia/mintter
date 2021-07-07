import {styled} from '@mintter/ui/stitches.config'
import {Box, Text, Icon} from '@mintter/ui'
import {useParams} from 'react-router-dom'
import toast from 'react-hot-toast'
import * as ContextMenu from '@radix-ui/react-context-menu'
import type {SPRenderElementProps} from '@udecode/slate-plugins-core'
import type {EditorBlock} from '../types'
import {Editor} from 'slate'
import {ReactEditor} from 'slate-react'
import {AnnotationList} from './annotation-list'

const StyledItem = styled(ContextMenu.Item, {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'start',
  gap: '$4',
  paddingVertical: '$2',
  paddingHorizontal: '$4',
  cursor: 'pointer',
  '&:focus': {
    outline: 'none',
    backgroundColor: '$primary-muted',
    cursor: 'pointer',
  },
})

const StyledContent = styled(ContextMenu.Content, {
  minWidth: 130,
  backgroundColor: 'white',
  borderRadius: 6,
  padding: 5,
  boxShadow: '0px 5px 15px -5px hsla(206,22%,7%,.15)',
})

// TODO: fix types
export function BlockElement({attributes, children, className, element, ...rest}: SPRenderElementProps<EditorBlock>) {
  // TODO: remove router dependency from block element
  const {docId} = useParams<{docId: string}>()

  async function onCopy() {
    await copyTextToClipboard(`mtt://${docId}/${element.id}`)
    toast.success('Block reference copied successfully')
  }
  return (
    <Box
      {...attributes}
      data-block-id={element.id}
      css={{
        position: 'relative',
        paddingVertical: '$2',
        paddingHorizontal: '$4',
        '&:hover': {
          backgroundColor: '$background-default',
          borderRadius: '3px',
        },
      }}
    >
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <Text alt size="4" className={className}>
            {children}
          </Text>
        </ContextMenu.Trigger>
        <StyledContent alignOffset={-5}>
          <StyledItem onSelect={onCopy}>
            <Icon size="1" name="Copy" />
            <Text size="2">Copy Block Ref</Text>
          </StyledItem>
        </StyledContent>
      </ContextMenu.Root>
      <AnnotationList quote={element} />
    </Box>
  )
}

function fallbackCopyTextToClipboard(text: string) {
  return new Promise((resolve, reject) => {
    const textArea = document.createElement('textarea')
    textArea.value = text

    // Avoid scrolling to bottom
    textArea.style.top = '0'
    textArea.style.left = '0'
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'

    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    try {
      document.execCommand('copy')
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err)
      reject(err)
    }

    document.body.removeChild(textArea)
    resolve(true)
  })
}

function copyTextToClipboard(text: string) {
  return new Promise((resolve, reject) => {
    if (!navigator.clipboard) {
      return fallbackCopyTextToClipboard(text)
    }
    return navigator.clipboard.writeText(text).then(
      () => {
        resolve(text)
      },
      (err) => {
        console.error('Async: Could not copy text: ', err)
        reject(err)
      },
    )
  })
}
