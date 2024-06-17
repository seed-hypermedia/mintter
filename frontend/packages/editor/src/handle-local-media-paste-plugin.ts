import {API_FILE_UPLOAD_URL} from '@shm/shared'
import {Extension} from '@tiptap/core'
import {Plugin, PluginKey} from 'prosemirror-state'

export const LocalMediaPastePlugin = Extension.create({
  name: 'local-media-paste',
  addProseMirrorPlugins() {
    return [handleLocalMediaPastePlugin]
  },
})

const handleLocalMediaPastePlugin = new Plugin({
  key: new PluginKey('pm-local-media-paste'),
  props: {
    handlePaste(view, event) {
      // console.log('== CURRENT SELECTION', view.state.selection)
      let currentSelection = view.state.selection
      const items = Array.from(event.clipboardData?.items || [])
      if (items.length === 0) return false
      for (const item of items) {
        // console.log('=== NEW ITEM', item)
        if (item.type.indexOf('image') === 0) {
          const img = item.getAsFile()
          if (img) {
            // return true
            uploadMedia(img)
              .then((data) => {
                const {name} = img
                const {schema} = view.state
                const node = schema.nodes.image.create({
                  url: data,
                  name: name,
                })
                view.dispatch(
                  view.state.tr.insert(currentSelection.anchor - 1, node),
                )
              })
              .catch((error) => {
                console.log(error)
              })
          }
          return true
        } else if (item.type.indexOf('video') === 0) {
          const vid = item.getAsFile()
          if (vid) {
            // return true
            uploadMedia(vid)
              .then((data) => {
                const {name} = vid
                const {schema} = view.state
                const node = schema.nodes.video.create({
                  url: data,
                  name: name,
                })
                view.dispatch(
                  view.state.tr.insert(currentSelection.anchor - 1, node),
                )
              })
              .catch((error) => {
                console.log(error)
              })
          }
          return true
        } else {
          const file = item.getAsFile()
          if (file) {
            // return true
            uploadMedia(file)
              .then((data) => {
                const {name, size} = file

                const node = view.state.schema.nodes.file.create({
                  url: data,
                  name: name,
                  size: size,
                })

                view.dispatch(
                  view.state.tr.insert(currentSelection.anchor - 1, node),
                )
              })
              .catch((error) => {
                console.log(error)
              })
            return true
          }
          return false
        }
      }
      return false
    },
  },
})

async function uploadMedia(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(API_FILE_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  })
  const data = await response.text()
  return `ipfs://${data}`
}
