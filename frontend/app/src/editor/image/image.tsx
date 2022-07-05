import {styled} from '@app/stitches.config'
import {Box} from '@components/box'
import {isImage} from '@mintter/mttast'
import {Editor} from 'slate'
import {RenderElementProps, useFocused, useSelected} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_IMAGE = 'image'

export function createImagePlugin(): EditorPlugin {
  return {
    name: ELEMENT_IMAGE,
    renderElement:
      (editor) =>
      ({element, children, attributes}) => {
        if (isImage(element)) {
          return (
            <Image element={element} attributes={attributes}>
              {children}
            </Image>
          )
        }
      },
    configureEditor(editor) {
      const {isVoid, isInline} = editor

      editor.isVoid = function imageVoid(element) {
        return isImage(element) || isVoid(element)
      }

      editor.isInline = function imageInline(element) {
        return isImage(element) || isInline(element)
      }

      return editor
    },
  }
}

function isImageSelected(editor: Editor) {
  console.log('selection: ', editor.selection)

  return false
}

const Img = styled('img', {
  display: 'block',
  maxWidth: '$full',
  width: '$full',
})

const ImgWrapper = styled(Box, {
  // position: 'absolute',
  userSelect: 'none',
})

function Image({element, attributes, children}: RenderElementProps) {
  // const editor = useSlateStatic()
  // const path = ReactEditor.findPath(editor, element)

  const selected = useSelected()
  const focused = useFocused()

  return element.url ? (
    <Box {...attributes}>
      {children}
      <ImgWrapper contentEditable={false}>
        <Img
          css={{
            boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
          }}
          src={element.url}
        />
      </ImgWrapper>
    </Box>
  ) : (
    <Box {...attributes}>
      {children}
      <ImgWrapper
        contentEditable={false}
        css={{
          boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
          padding: '$5',
        }}
      >
        add image here
      </ImgWrapper>
    </Box>
  )
}
