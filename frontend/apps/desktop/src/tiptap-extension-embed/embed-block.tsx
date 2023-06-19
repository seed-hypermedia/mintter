import {BlockSpec, createTipTapBlock, defaultProps} from '@app/blocknote-core'
import {createReactBlockSpec, InlineContent} from '@app/blocknote-react'
import {mergeAttributes, Node, nodeInputRule, nodePasteRule} from '@tiptap/core'
import {NodeType} from '@tiptap/pm/model'
import {TextSelection} from '@tiptap/pm/state'
import {useEffect, useState} from 'react'

export interface EmbedBlockOptions {
  HTMLAttributes: Record<string, any>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    embedBlock: {
      /**
       * Add a embed block
       */
      setEmbedBlock: () => ReturnType
    }
  }
}

// export const EmbedBlock = Node.create<EmbedBlockOptions>({
//   name: 'embedBlock',

//   addOptions() {
//     return {
//       HTMLAttributes: {},
//     }
//   },

//   group: 'block',

//   parseHTML() {
//     return [{tag: 'embed'}]
//   },

//   renderHTML({HTMLAttributes}) {
//     return ['hr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)]
//   },

//   addCommands() {
//     return {
//       setEmbedBlock:
//         () =>
//         ({chain}) => {
//           return (
//             chain()
//               .insertContent({type: this.name})
//               // set cursor after horizontal rule
//               .command(({tr, dispatch}) => {
//                 if (dispatch) {
//                   const {$to} = tr.selection
//                   const posAfter = $to.end()

//                   if ($to.nodeAfter) {
//                     tr.setSelection(TextSelection.create(tr.doc, $to.pos))
//                   } else {
//                     // add node after horizontal rule if it’s the end of the document
//                     const node =
//                       $to.parent.type.contentMatch.defaultType?.create()

//                     if (node) {
//                       tr.insert(posAfter, node)
//                       tr.setSelection(TextSelection.create(tr.doc, posAfter))
//                     }
//                   }

//                   tr.scrollIntoView()
//                 }

//                 return true
//               })
//               .run()
//           )
//         },
//     }
//   },

//   addPasteRules() {
//     return [
//       nodePasteRule({
//         type: this.type,
//         find: new RegExp(/hd:\/\/.*/g),
//         getAttributes(match) {},
//       }),
//     ]
//   },
// })

export const EmbedBlock = createReactBlockSpec({
  type: 'embedBlock',
  propSchema: {
    ref: {
      default: '',
    },
  },
  containsInlineContent: true,
  //   containsInlineContent: false,
  render: ({block}) => {
    return (
      <div id={block.id} className="embed-block" data-ref={block.props.ref}>
        <p style={{userSelect: 'none'}}>{block.props.ref}</p>
      </div>
    )
  },
})

// export const EmbedBlock = {
//   node: createTipTapBlock<'embedBlock'>({
//     name: 'embedBlock',
//     content: '',
//     addAttributes() {
//       return {
//         ref: {
//           default: '',
//           parseHTML: (element) => element.getAttribute('data-ref'),
//           renderHTML: (attributes) => {
//             return {
//               'data-ref': attributes.ref,
//             }
//           },
//         },
//       }
//     },
//     parseHTML() {
//       return [
//         {
//           tag: 'div',
//           priority: 200,
//           node: 'embed',
//         },
//       ]
//     },

//     renderHTML({HTMLAttributes, node}) {
//       return [
//         'div',
//         mergeAttributes(HTMLAttributes, {
//           'data-type': this.name,
//           'data-ref': node.attrs.ref,
//         }),
//         0,
//       ]
//     },
//     addPasteRules() {
//       return [
//         nodePasteRule({
//           type: this.type,
//           find: new RegExp(/hd:\/\/.*/g),
//           getAttributes(match) {
//             if (!match.input) return {}
//             return {
//               ref: match.input,
//             }
//           },
//         }),
//       ]
//     },
//   }),
//   propSchema: {},
// }
