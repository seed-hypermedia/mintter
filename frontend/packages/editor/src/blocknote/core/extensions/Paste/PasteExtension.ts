import {BACKEND_FILE_UPLOAD_URL} from '@mintter/shared/src/constants'
import {Extension} from '@tiptap/core'
import {Plugin, PluginKey} from 'prosemirror-state'

const PLUGIN_KEY = new PluginKey(`PastePlugin`)

async function uploadMedia(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch(BACKEND_FILE_UPLOAD_URL, {
    method: 'POST',
    body: formData,
  })
  const data = await response.text()
  return data
}

async function getExternalBlob(url: string) {
  const blob = await fetch(url).then((res) => res.blob())
  const webFile = new File([blob], `mintterImage.${blob.type.split('/').pop()}`)
  return webFile
}

export const Paste = Extension.create({
  name: 'paste',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: PLUGIN_KEY,
        props: {
          handlePaste: function (view, event, slice) {
            const items = Array.from(event.clipboardData?.items || [])
            if (items.length === 0) return false
            for (const item of items) {
              // if (item.type.indexOf('text/html') === 0) {
              //   item.getAsString((s) => {
              //     console.log(slice)
              //     const tempDiv = document.createElement('div')
              //     tempDiv.innerHTML = s

              //     // Find the <img> element inside the temporary div
              //     const imgElement = tempDiv.querySelector('img')
              //     console.log(tempDiv, imgElement)
              //     const imgSrc = imgElement?.getAttribute('src')

              //     if (imgSrc) {
              //       getExternalMedia(imgSrc).then((file) => {
              //         uploadMedia(file)
              //           .then((data) => {
              //             const {name} = file
              //             const {schema, selection} = view.state
              //             const {$from, $to} = selection

              //             console.log($from, $to, selection)

              //             const node = schema.nodes.image.create({
              //               url: data,
              //               name: name,
              //             })

              //             const transaction = view.state.tr.replaceWith(
              //               $from.before($from.depth),
              //               $to.pos,
              //               node,
              //             )
              //             view.dispatch(transaction)
              //           })
              //           .catch((error) => {
              //             console.log(error)
              //           })
              //       })
              //     } else {
              //       console.log('No <img> element found in the HTML string.')
              //     }
              //   })
              // }
              if (item.type.indexOf('image') === 0) {
                const img = item.getAsFile()
                if (img) {
                  uploadMedia(img)
                    .then((data) => {
                      const {name} = img
                      const {schema, selection} = view.state
                      const {$from, $to} = selection

                      const node = schema.nodes.image.create({
                        url: data,
                        name: name,
                      })

                      const transaction = view.state.tr.replaceWith(
                        $from.before($from.depth),
                        $to.pos,
                        node,
                      )
                      view.dispatch(transaction)
                    })
                    .catch((error) => {
                      console.log(error)
                    })
                }
                return true
              }
            }
            return false
          },
        },
      }),
    ]
  },
})
