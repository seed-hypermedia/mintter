import {wrapLink} from '@app/editor/link'
import {EditorMode} from '@app/editor/plugin-utils'
import {
  EmbedUrlData,
  isCollapsed,
  isValidUrl,
  parseVideoUrl,
} from '@app/editor/utils'
import {videoMachine} from '@app/editor/video/video-machine'
import {debug} from '@app/utils/logger'
import {Box} from '@components/box'
import {Button} from '@components/button'
import {Icon} from '@components/icon'
import {Text} from '@components/text'
import {TextField} from '@components/text-field'
import {isVideo, text, video, Video as VideoType} from '@mintter/mttast'
import {useActor, useInterpret} from '@xstate/react'
import isUrl from 'is-url'
import {FormEvent, useMemo} from 'react'
import {Editor, Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useFocused,
  useSelected,
  useSlateStatic,
} from 'slate-react'
import {ActorRefFrom, assign} from 'xstate'
import type {EditorPlugin} from '../types'

export const ELEMENT_VIDEO = 'video'

export function createVideoPlugin(): EditorPlugin {
  return {
    name: ELEMENT_VIDEO,
    renderElement: () => {
      return (props) => {
        if (isVideo(props.element)) {
          return <Video {...props} />
        }
      }
    },
    configureEditor(editor) {
      const {insertData, isVoid, isInline, insertText} = editor

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
        } else {
          insertData(data)
        }
      }

      return editor
    },
  }
}

function insertVideo(editor: Editor, url: string) {
  const {selection} = editor

  if (isCollapsed(selection!)) {
    const newVideo = video({url}, [text('')])
    Transforms.insertNodes(editor, newVideo)
    Transforms.move(editor, {distance: 1, unit: 'offset'})
  } else {
    wrapLink(editor, url)
  }
}

function Video({element, attributes, children}: RenderElementProps) {
  const editor = useSlateStatic()
  const path = ReactEditor.findPath(editor, element)
  const videoService = useInterpret(() => videoMachine, {
    actions: {
      assignError: assign({
        errorMessage: (c) => {
          console.log('ASSIGN ERROR!!')

          return `Image error: image url is not a valid URL: ${
            (element as VideoType).url
          }`
        },
      }),
      assignValidUrl: (_, event) => {
        Transforms.setNodes<VideoType>(editor, {url: event.data}, {at: path})
      },
      updateCaption: (_, event) => {
        Transforms.setNodes<VideoType>(editor, {alt: event.value}, {at: path})
      },
      assignCaptionVisibility: assign({
        captionVisibility: () => {
          debug(
            '\n\n=== captionVisibility',
            editor.mode == EditorMode.Draft
              ? true
              : !!(element as VideoType).alt,
          )
          return editor.mode == EditorMode.Draft
            ? true
            : !!(element as VideoType).alt
        },
      }),
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
  console.log('🚀 ~ file: video.tsx ~ line 130 ~ Video ~ state', state)

  return (
    <Box {...attributes}>
      {children}
      {state.matches('init') ? (
        <Box
          css={{
            padding: '$5',
            borderRadius: '$2',
            background: '$base-component-bg-normal',
          }}
        >
          <Text color="muted" size="3">
            Loading image...
          </Text>
        </Box>
      ) : null}
      {state.matches('video') ? (
        <VideoComponent service={videoService} element={element as VideoType} />
      ) : null}
      {state.matches('editVideo') ? (
        <VideoForm service={videoService} element={element as VideoType} />
      ) : null}
    </Box>
  )
}

type InnerVideoProps = {
  service: ActorRefFrom<typeof videoMachine>
  element: VideoType
}

function VideoComponent({service, element}: InnerVideoProps) {
  let [state, send] = useActor(service)

  const videoData = useMemo(() => parseVideoUrl(element.url), [element.url])

  if (videoData?.provider == 'youtube') {
    return <YoutubeEmbed service={service} videoData={videoData} />
  }

  if (videoData?.provider == 'vimeo') {
    return <YoutubeEmbed service={service} videoData={videoData} />
  }

  return null
}

type VideoEmbedProps = {
  videoData: EmbedUrlData
  service: ActorRefFrom<typeof videoMachine>
}

// let paddingProvider = {
//   youtube: '56.2061%',
//   // vimeo: '75%',
//   vimeo: '56.2061%',
// }

function YoutubeEmbed({videoData}: VideoEmbedProps) {
  let {url, provider} = videoData

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
      }}
    >
      <iframe
        src={url}
        frameBorder="0"
        sandbox="allow-scripts allow-popups allow-top-navigation-by-user-activation allow-forms allow-same-origin"
        allowFullScreen
      />
    </Box>
  )
}

function VideoForm({service, element}: InnerVideoProps) {
  const [state, send] = useActor(service)
  const selected = useSelected()
  const focused = useFocused()

  function submitImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let formData = new FormData(event.currentTarget)
    let value: string = formData.get('url')?.toString() || ''
    send({type: 'VIDEO.SUBMIT', value})
  }

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
          as="form"
          css={{
            width: '$full',
            display: 'flex',
            alignItems: 'center',
            gap: '$4',
          }}
          onSubmit={submitImage}
        >
          <TextField type="url" placeholder="Add an Video URL" name="url" />
          <Button type="submit">Save</Button>
        </Box>
      </Box>
      {state.context.errorMessage ? (
        <Text color="danger" size={1} css={{userSelect: 'none'}}>
          {state.context.errorMessage}
        </Text>
      ) : null}
    </Box>
  )
}
