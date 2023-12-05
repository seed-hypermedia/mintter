import {toast} from '@mintter/app/toast'
import {BACKEND_FILE_UPLOAD_URL} from '@mintter/shared'
import {Editor, Extension} from '@tiptap/core'
import {Plugin, PluginKey} from 'prosemirror-state'

const PLUGIN_KEY = new PluginKey(`drop-plugin`)

export interface DragOptions {
  editor: Editor
}

export const DragExtension = Extension.create<DragOptions>({
  name: 'drag',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          handleDOMEvents: {
            dragstart: (view, event) => {
              event.preventDefault()
              return false
            },
            dragleave: (view, event) => {
              event.preventDefault()
              return false
            },
            dragend: (view, event) => {
              event.preventDefault()
              return false
            },
            dragover: (view, event) => {
              event.preventDefault()
              return false
            },
            drop: (view, event) => {
              let file: File | null =
                event.dataTransfer?.items?.[0]?.getAsFile() ||
                event.dataTransfer?.files?.[0] ||
                null
              if (!file) return false
              event.preventDefault()
              event.stopPropagation()
              const pos = this.editor.view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })
              if (pos && pos.inside !== -1) {
                handleDragMedia(file).then((props) => {
                  if (!props) return false
                  if (chromiumSupportedImageMimeTypes.has(file!.type)) {
                    let tr = view.state.tr
                    const node = view.state.schema.nodes.image.create({
                      url: props?.url,
                      name: props?.name,
                    })
                    tr = tr.insert(pos.pos - 1, node)
                    view.dispatch(tr)
                  } else if (chromiumSupportedVideoMimeTypes.has(file!.type)) {
                    let tr = view.state.tr
                    const node = view.state.schema.nodes.video.create({
                      url: props?.url,
                      name: props?.name,
                    })
                    tr = tr.insert(pos.pos - 1, node)
                    view.dispatch(tr)
                  } else {
                    let tr = view.state.tr
                    const node = view.state.schema.nodes.file.create({
                      ...props,
                    })
                    tr = tr.insert(pos.pos - 1, node)
                    view.dispatch(tr)
                  }
                  return true
                })
              }
              return false
            },
          },
        },
      }),
    ]
  },
})

type FileType = {
  id: string
  props: {
    url: string
    name: string
    size: string
  }
  children: []
  content: []
  type: string
}

export async function handleDragMedia(file: File) {
  if (file.size > 62914560) {
    toast.error(`The size of ${file.name} exceeds 60 MB.`)
    return null
  }

  const formData = new FormData()
  formData.append('file', file)

  try {
    const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    })
    const data = await response.text()
    return {
      url: data ? `ipfs://${data}` : '',
      name: file.name,
      size: file.size.toString(),
    } as FileType['props']
  } catch (error) {
    console.log(error.message)
    toast.error('Failed to upload file.')
  }
}

const chromiumSupportedImageMimeTypes = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'image/apng',
  'image/avif',
])

const chromiumSupportedVideoMimeTypes = new Set(['video/mp4', 'video/webm'])
