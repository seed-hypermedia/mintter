import {findParentNode, InputRule, mergeAttributes, Node} from '@tiptap/core'
import styles from './Block.module.css'

export const BlockGroup = Node.create({
  name: 'blockGroup',
  group: 'blockGroup',
  content: 'blockContainer+',

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  addAttributes() {
    return {
      listType: {
        default: 'div',
        // instead of "level" attributes, use "data-level"
        parseHTML: (element) => element.getAttribute('data-list-type'),
        renderHTML: (attributes) => {
          return {
            'data-list-type': attributes.listType,
          }
        },
      },
    }
  },

  addInputRules() {
    return [
      // Creates an unordered list when starting with "-", "+", or "*".
      new InputRule({
        find: new RegExp(`^[-+*]\\s$`),
        handler: ({state, chain, range}) => {
          chain()
            .UpdateGroup(state.selection.from, 'ul')
            // Removes the "-", "+", or "*" character used to set the list.
            .deleteRange({from: range.from, to: range.to})
        },
      }),
      new InputRule({
        find: new RegExp(`^1\\.\\s$`),
        handler: ({state, chain, range}) => {
          chain()
            .UpdateGroup(state.selection.from, 'ol')
            // Removes the "1." characters used to set the list.
            .deleteRange({from: range.from, to: range.to})
        },
      }),
    ]
  },

  parseHTML() {
    return [
      {
        tag: 'ul',
        // attrs: {listType: 'ul'},
        getAttrs: (element) => {
          if (typeof element === 'string') {
            return false
          }
          return (
            element.getAttribute('data-node-type') === 'blockGroup' &&
            element.getAttribute('data-list-type') === 'ul' &&
            null
          )
        },
        priority: 200,
      },
      {
        tag: 'ol',
        // attrs: {listType: 'ol'},
        getAttrs: (element) => {
          if (typeof element === 'string') {
            return false
          }
          return (
            element.getAttribute('data-node-type') === 'blockGroup' &&
            element.getAttribute('data-list-type') === 'ol' &&
            null
          )
        },
        priority: 200,
      },
      {
        tag: 'div',
        getAttrs: (element) => {
          if (typeof element === 'string') {
            return false
          }

          if (element.getAttribute('data-node-type') === 'blockGroup') {
            // Null means the element matches, but we don't want to add any attributes to the node.
            return null
          }

          return false
        },
        priority: 100,
      },
    ]
  },

  renderHTML({node, HTMLAttributes}) {
    return [
      node.attrs.listType,
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: styles.blockGroup,
        'data-node-type': 'blockGroup',
      }),
      0,
    ]
  },
})
