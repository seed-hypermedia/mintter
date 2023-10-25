import {mergeAttributes} from '@tiptap/core'
import {createTipTapBlock, mergeCSSClasses} from '..'
import styles from '@/blocknote/core/extensions/Blocks/nodes/Block.module.css'
import {Plugin, PluginKey} from 'prosemirror-state'
import {BACKEND_FILE_UPLOAD_URL} from '@mintter/shared'

export const ImagePlaceholder = createTipTapBlock<'imagePlaceholder'>({
  name: 'imagePlaceholder',

  addAttributes() {
    return {
      src: {
        default: null,
      },
      title: {
        default: null,
      },
    }
  },

  // parseHTML() {
  //   return [
  //     {
  //       tag: 'img[src]',
  //     },
  //   ]
  // },

  renderHTML({HTMLAttributes}) {
    const blockContentDOMAttributes =
      this.options.domAttributes?.blockContent || {}
    return [
      'img',
      mergeAttributes({
        ...blockContentDOMAttributes,
        class: mergeCSSClasses(
          styles.blockContent,
          blockContentDOMAttributes.class,
        ),
        'data-content-type': this.name,
        'data-src': HTMLAttributes.src,
        'data-title': HTMLAttributes.title,
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('handlePasteImage'),
        props: {
          handlePaste: function (view, event, slice) {
            const items = Array.from(event.clipboardData?.items || [])
            if (items.length === 0) return false
            for (const item of items) {
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
