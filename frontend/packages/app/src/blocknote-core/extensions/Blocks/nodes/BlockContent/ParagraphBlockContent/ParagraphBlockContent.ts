import {InputRule, mergeAttributes} from '@tiptap/core'
import {createTipTapBlock} from '../../../api/block'
import styles from '../../Block.module.css'

export const ParagraphBlockContent = createTipTapBlock<'paragraph'>({
  name: 'paragraph',
  content: 'inline*',

  addAttributes() {
    return {
      type: {
        default: 'p',
        // instead of "type" attributes, use "data-type"
        parseHTML: (element) => element.getAttribute('data-type'),
        renderHTML: (attributes) => {
          return {
            'data-type': attributes.type,
          }
        },
      },
    }
  },

  // addInputRules() {
  //   // console.log('here')
  //   return [
  //     ...['p', 'code', 'blockquote'].map((type) => {
  //       console.log(type)
  //       // Creates a heading of appropriate type when starting with "#", "##", or "###".
  //       return new InputRule({
  //         find: new RegExp(`^(#{${parseInt(type)}})\\s$`),
  //         handler: ({state, chain, range}) => {
  //           console.log(state)
  //           chain()
  //             .BNUpdateBlock(state.selection.from, {
  //               type: 'paragraph',
  //               props: {
  //                 type: type as 'p' | 'code' | 'blockquote',
  //               },
  //             })
  //             // Removes the "#" character(s) used to set the heading.
  //             .deleteRange({from: range.from, to: range.to})
  //         },
  //       })
  //     }),
  //   ]
  // },

  parseHTML() {
    return [
      {
        tag: 'p',
        priority: 200,
        attrs: {type: 'p'},
        node: 'paragraph',
      },
    ]
  },

  renderHTML({node, HTMLAttributes}) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: styles.blockContent,
        'data-content-type': this.name,
      }),
      [node.attrs.type, {class: styles.inlineContent}, 0],
    ]
  },
})
