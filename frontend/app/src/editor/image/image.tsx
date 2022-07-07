import {imageMachine} from '@app/editor/image/image-machine'
import {styled} from '@app/stitches.config'
import {Box} from '@components/box'
import {Image as ImageType, isImage} from '@mintter/mttast'
import {useMachine} from '@xstate/react'
import {Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
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
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)

  const selected = useSelected()
  const focused = useFocused()

  const [state, send] = useMachine(() => imageMachine, {
    actions: {
      updateCaption: (_, event) => {
        Transforms.setNodes(editor, {alt: event.value}, {at: path})
      },
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      assignError: () => {},
      // showCaption: () => {},
    },
    guards: {
      isImageURL: () => element.url,
    },
  })

  return state.matches('idle') ? (
    <Box {...attributes}>
      {children}
      <ImgWrapper contentEditable={false}>
        <Img
          css={{
            boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
          }}
          src={(element as ImageType).url}
        />
      </ImgWrapper>

      <Box
        as="form"
        onClick={() => {
          if (state.matches('idle.captionInactive')) {
            send({type: 'CAPTION.EDIT'})
          }
        }}
        onBlur={() => send({type: 'CAPTION.BLUR'})}
        onSubmit={(e) => {
          console.log('SUBMIT!', e)
          e.preventDefault()
          send({type: 'CAPTION.BLUR'})
        }}
      >
        <Box
          as="input"
          css={{
            display: 'block',
            width: '$full',
            border: 'none',
            background: 'transparent',
            color: '$base-text-high',
          }}
          onBlur={() => send({type: 'CAPTION.BLUR'})}
          disabled={state.matches('idle.captionInactive')}
          value={element.alt}
          onChange={(e) =>
            send({type: 'CAPTION.UPDATE', value: e.target.value})
          }
        />
      </Box>
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
