import {wrapLink} from '@app/editor/link'
import {EditorMode} from '@app/editor/plugin-utils'
import {
  EmbedUrlData,
  isCollapsed,
  isValidUrl,
  parseVideoUrl,
} from '@app/editor/utils'
import {videoMachine} from '@app/editor/video/video-machine'
import {Box} from '@components/box'
import {Icon} from '@components/icon'
import {isVideo, text, video, Video as VideoType} from '@mintter/shared'
import {Button, Input, SizableText} from '@mintter/ui'
import {useActor, useInterpret, useSelector} from '@xstate/react'
import isUrl from 'is-url'
import {useState} from 'react'
import {Editor, Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {ActorRefFrom} from 'xstate'
import type {EditorPlugin} from '../types'

export const ELEMENT_VIDEO = 'video'

export function createVideoPlugin(): EditorPlugin {
  return {
    name: ELEMENT_VIDEO,
    configureEditor(editor) {
      const {insertData, isVoid, isInline} = editor

      editor.isVoid = function videoVoid(element) {
        return isVideo(element) || isVoid(element)
      }

      editor.isInline = function videoInline(element) {
        return isVideo(element) || isInline(element)
      }

      editor.insertData = function videoInsertdata(data) {
        const text = data.getData('text/plain')
        if (text) {
          let videoData = parseVideoUrl(text)
          if (isUrl(text) && videoData) {
            insertVideo(editor, text)
          }
        }
        insertData(data)
      }

      return editor
    },
  }
}

function insertVideo(editor: Editor, url: string) {
  const {selection} = editor

  if (isCollapsed(selection)) {
    const newVideo = video({url}, [text('')])
    Transforms.insertNodes(editor, newVideo)
    Transforms.move(editor, {distance: 1, unit: 'offset'})
  } else {
    wrapLink(editor, url)
  }
}

export function VideoElement({
  element,
  attributes,
  children,
}: RenderElementProps) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const videoService = useInterpret(() => videoMachine, {
    actions: {
      assignValidUrl: (_, event) => {
        Transforms.setNodes<VideoType>(editor, {url: event.data}, {at: path})
      },
      updateCaption: (_, event) => {
        Transforms.setNodes<VideoType>(editor, {alt: event.value}, {at: path})
      },
    },
    guards: {
      hasVideoUrl: () => !!(element as VideoType).url,
    },
    services: {
      validateUrlService: (_, event) => {
        return isValidUrl(event.value)
      },
    },
  })

  const [state] = useActor(videoService)

  return (
    <Box {...attributes}>
      {children}
      {state.matches('video') ? (
        <VideoComponent
          mode={editor.mode}
          service={videoService}
          element={element as VideoType}
        />
      ) : (
        <VideoForm
          mode={editor.mode}
          service={videoService}
          element={element as VideoType}
        />
      )}
    </Box>
  )
}

type InnerVideoProps = {
  service: ActorRefFrom<typeof videoMachine>
  element: VideoType
  mode: EditorMode
}

function VideoComponent({service, element, mode}: InnerVideoProps) {
  let videoData = parseVideoUrl(element.url)
  if (videoData?.provider) {
    return <VideoEmbed mode={mode} service={service} videoData={videoData} />
  }

  return null
}

type VideoEmbedProps = {
  videoData: EmbedUrlData
  service: ActorRefFrom<typeof videoMachine>
  mode: EditorMode
}

// let paddingProvider = {
//   youtube: '56.2061%',
//   // vimeo: '75%',
//   vimeo: '56.2061%',
// }

function VideoEmbed({videoData, service, mode}: VideoEmbedProps) {
  let {url} = videoData

  return (
    <Box
      css={{
        width: '$full',
        // paddingBottom: provider ? paddingProvider[provider] : '56.2061%',
        paddingBottom: '56.2061%',
        position: 'relative',
        '& > iframe': {
          position: 'absolute',
          width: '$full',
          height: '$full',
        },
        '&:hover .hover-tools': {
          opacity: 1,
          visibility: 'visible',
          pointerEvents: 'inherit',
        },
      }}
    >
      {mode == EditorMode.Draft ? (
        <Box
          className="hover-tools"
          css={{
            position: 'absolute',
            top: 0,
            right: '$3',
            transition: 'opacity 0.25s ease',
            zIndex: '$4',
            opacity: 0,
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <Button
            size="$1"
            theme="gray"
            onPress={() => service.send('VIDEO.REPLACE')}
          >
            replace
          </Button>
        </Box>
      ) : null}
      <iframe
        src={url}
        frameBorder="0"
        sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation allow-forms allow-same-origin"
      />
    </Box>
  )
}

function VideoForm({service}: InnerVideoProps) {
  let errorMessage = useSelector(service, (state) => state.context.errorMessage)
  const selected = useSelected()
  const focused = useFocused()
  const [url, setUrl] = useState('')

  return (
    <Box
      css={{
        display: 'flex',
        flexDirection: 'column',
        gap: '$3',
      }}
    >
      <Box
        contentEditable={false}
        css={{
          backgroundColor: '$base-component-bg-normal',
          boxShadow: selected && focused ? '0 0 0 3px #B4D5FF' : 'none',
          padding: '$5',
          display: 'flex',
          alignItems: 'center',
          '&:hover': {
            backgroundColor: '$base-component-bg-hover',
          },
        }}
      >
        <Box
          css={{
            flex: 'none',
            marginRight: '$5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="Video" size="2" />
        </Box>
        <Box
          css={{
            width: '$full',
            display: 'flex',
            alignItems: 'center',
            gap: '$4',
            whiteSpace: 'nowrap',
          }}
        >
          <Input
            onChangeText={(val) => setUrl(val)}
            value={url}
            placeholder="Add an Video URL"
            id="url"
          />
          <Button
            onPress={() => service.send({type: 'VIDEO.SUBMIT', value: url})}
          >
            Save
          </Button>
          <Button
            size="$1"
            chromeless
            opacity={0.5}
            onPress={() => service.send('VIDEO.CANCEL')}
          >
            Cancel
          </Button>
        </Box>
      </Box>
      {errorMessage ? (
        <SizableText size="$1" theme="red">
          {errorMessage}
        </SizableText>
      ) : null}
    </Box>
  )
}
