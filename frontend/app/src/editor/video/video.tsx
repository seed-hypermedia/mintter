import {styled} from '@app/stitches.config'
import {Box} from '@components/box'
import {isVideo} from '@mintter/mttast'
import {RenderElementProps, useFocused, useSelected} from 'slate-react'
import type {EditorPlugin} from '../types'

export const ELEMENT_VIDEO = 'video'

export function createVideoPlugin(): EditorPlugin {
  return {
    name: ELEMENT_VIDEO,
    renderElement: () => {
      return (props) => {
        if (isVideo(props.element)) {
          if (props.element.url) {
            return <Video {...props} />
          }
        }
      }
    },
    configureEditor(editor) {
      const {insertData, isVoid, isInline} = editor

      editor.isVoid = function videoVoid(element) {
        return isVideo(element) || isVoid(element)
      }

      editor.isInline = function videoInline(element) {
        return isVideo(element) || isInline(element)
      }

      editor.insertData = function videoInsertdata(data) {
        // TODO: insertData for videos

        return insertData(data)
      }

      return editor
    },
  }
}

const VideoElement = styled('video', {
  display: 'block',
  maxWidth: '$full',
  width: '$full',
  position: 'absolute',
  top: '0',
  left: '0',
  height: '100%',
})

function Video({element, attributes, children}: RenderElementProps) {
  // const editor = useSlateStatic()
  // const path = ReactEditor.findPath(editor, element)
  console.log('Video element', element)

  const selected = useSelected()
  const focused = useFocused()

  return (
    <Box {...attributes}>
      {children}
      <Box contentEditable={false}>
        <iframe
          src={`${element.url}?title=0&byline=0&portrait=0`}
          frameBorder="0"
          style={{}}
        />
        <Box
          css={{
            padding: '75% 0 0 0',
            position: 'relative',
          }}
        >
          <VideoElement
            css={{
              boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
            }}
            frameBorder={0}
            src={element.url}
          />
        </Box>
      </Box>
    </Box>
  )
}
