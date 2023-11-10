import {mergeAttributes} from '@tiptap/core'
import {createTipTapBlock, mergeCSSClasses} from '..'
import styles from '@/blocknote/core/extensions/Blocks/nodes/Block.module.css'
import {EditorState, Plugin, PluginKey} from 'prosemirror-state'
import {BACKEND_FILE_UPLOAD_URL} from '@mintter/shared'
import {Decoration, DecorationSet} from '@tiptap/pm/view'
import {Fragment} from '@tiptap/pm/model'
import {client} from '@mintter/desktop/src/trpc'

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

  parseHTML() {
    return [
      {
        tag: 'img[src]',
      },
    ]
  },

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
    let pastePlugin = new Plugin({
      key: new PluginKey('image-placeholder'),
      // state: {
      //   init() {
      //     return DecorationSet.empty
      //   },
      //   apply(tr, set) {
      //     // Adjust decoration positions to changes made by the transaction
      //     set = set.map(tr.mapping, tr.doc)
      //     // See if the transaction adds or removes any placeholders
      //     let action = tr.getMeta(pastePlugin)
      //     if (action && action.add) {
      //       console.log('======== image upload ADD', action)
      //       let widget = document.createElement('div')
      //       widget.style.backgroundColor = 'red'
      //       widget.style.height = '44px'
      //       let deco = Decoration.widget(action.add.pos, widget, {
      //         id: action.add.id,
      //       })
      //       set = set.add(tr.doc, [deco])
      //     } else if (action && action.remove) {
      //       console.log('======== image upload REMOVE', action)
      //       set = set.remove(
      //         set.find(
      //           undefined,
      //           undefined,
      //           (spec) => spec.id == action.remove.id,
      //         ),
      //       )
      //     }
      //     return set
      //   },
      // },
      props: {
        // decorations(state) {
        //   return this.getState(state)
        // },
        // handlePaste(view, event, slice) {
        //   let tr = view.state.tr
        //   slice.content.descendants((node, pos, parent, index) => {
        //     if (node.type.name == 'imagePlaceholder') {
        //       let id = {}
        //       console.log('== image placeholder pos SLICE DESCENDANTS', {
        //         node,
        //         pos,
        //         index,
        //       })
        //       performUpload(node, pos, index)
        //       // tr.setMeta(pastePlugin, {
        //       //   add: {id, pos},
        //       // })
        //       // view.dispatch(tr)
        //     }
        //   })
        //   function performUpload(node, pos, index) {
        //     let id = {}
        //     let tr = view.state.tr
        //     tr.setMeta(pastePlugin, {
        //       add: {id, pos},
        //     })
        //     view.dispatch(tr)
        //     client.webImporting.importWebFile
        //       .mutate(node.attrs.src)
        //       .then((data) => {
        //         console.log('== image placeholder upload END', data)
        //         view.state.doc.descendants((viewNode, newPos) => {
        //           if (viewNode.attrs.src == node.attrs.src) {
        //             view.dispatch(
        //               view.state.tr
        //                 .replaceWith(
        //                   newPos,
        //                   newPos,
        //                   view.state.schema.nodes.image.create({
        //                     url: `ipfs://${data.cid}`,
        //                     name: 'image.png',
        //                   }),
        //                 )
        //                 .setMeta(pastePlugin, {remove: {id}}),
        //             )
        //           }
        //         })
        //       })
        //       .catch((error) => {
        //         console.log(error)
        //       })
        //   }
        //   // function findPlaceholder(state: EditorState, id: any) {
        //   //   let decos = pastePlugin.getState(state)
        //   //   console.log('== image upload STATE', decos)
        //   //   let found = decos?.find(
        //   //     undefined,
        //   //     undefined,
        //   //     (spec) => spec.id == id,
        //   //   )
        //   //   console.log(`== ~ findPlaceholder ~ found:`, found)
        //   //   return found?.length ? found[0].from : null
        //   // }
        //   function findPlaceholder(state: EditorState, id: any) {
        //     let decos = pastePlugin.getState(state)
        //     console.log('== image upload STATE', decos)
        //     let found = decos?.find(
        //       undefined,
        //       undefined,
        //       (spec) => spec.id == id,
        //     )
        //     console.log(`== ~ findPlaceholder ~ found:`, found)
        //     return found?.length ? found[0].from : null
        //   }
        // },
      },
    })
    return [pastePlugin]
  },
})
