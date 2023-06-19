import {
  Extension,
  mergeAttributes,
  Node,
  nodePasteRule,
  PasteRule,
} from '@tiptap/core'
import {insertContent} from '@tiptap/core/dist/packages/core/src/commands'
import {NodeType, Node as ProseMirrorNode} from '@tiptap/pm/model'
import {Plugin, PluginKey} from '@tiptap/pm/state'
import Suggestion, {SuggestionOptions} from '@tiptap/suggestion'

export type _EmbedOptions = {
  HTMLAttributes: Record<string, any>
  renderLabel: (props: {options: EmbedOptions; node: ProseMirrorNode}) => string
}

export type EmbedOptions = {
  HTMLAttributes: Record<string, any>
}

export const EmbedPluginKey = new PluginKey('embed')

export const Embed = Node.create<EmbedOptions>({
  group: 'inline',
  selectable: false,
  atom: true,
  addAttributes() {
    return {
      ref: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-ref'),
        renderHTML: (attributes) => {
          if (!attributes.ref) {
            return {}
          }

          return {
            'data-ref': attributes.ref,
          }
        },
      },
    }
  },

  renderHTML({node, HTMLAttributes}) {
    return [
      'span',
      mergeAttributes({
        'data-ref': node.attrs.ref,
      }),
    ]
  },
})

const _Embed = Node.create<_EmbedOptions>({
  name: 'embed',

  addOptions() {
    return {
      HTMLAttributes: {},
      renderLabel({node}) {
        return 'EMBED'
      },
    }
  },

  group: 'inline',

  inline: true,

  selectable: false,

  atom: true,

  marks: '',

  inclusive: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-id'),
        renderHTML: (attributes) => {
          if (!attributes.id) {
            return {}
          }

          return {
            'data-id': attributes.id,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${this.name}"]`,
      },
    ]
  },

  onCreate() {
    console.log('ON CREATE!', this)
  },

  renderHTML({node, HTMLAttributes}) {
    return [
      'span',
      mergeAttributes(
        {'data-type': this.name},
        this.options.HTMLAttributes,
        HTMLAttributes,
      ),
      this.options.renderLabel({
        options: this.options,
        node,
      }),
    ]
  },

  // renderText({node}) {
  //   return this.options.renderLabel({
  //     options: this.options,
  //     node,
  //   })
  // },

  // addKeyboardShortcuts() {
  //   return {
  //     Backspace: () =>
  //       this.editor.commands.command(({tr, state}) => {
  //         let isEmbed = false
  //         const {selection} = state
  //         const {empty, anchor} = selection

  //         if (!empty) {
  //           return false
  //         }

  //         state.doc.nodesBetween(anchor - 1, anchor, (node, pos) => {
  //           if (node.type.name === this.name) {
  //             isEmbed = true
  //             tr.insertText('E' || '', pos, pos + node.nodeSize)

  //             return false
  //           }
  //         })

  //         return isEmbed
  //       }),
  //   }
  // },
  addPasteRules() {
    return [
      new PasteRule({
        find: new RegExp(/hd:\/\/.*/g),
        handler: ({state, range, match, chain, commands}) => {
          if (match.input) {
            console.log('INSERT EMBED!!', state, range, match.input)
            this.editor
              .chain()
              .deleteRange(range)
              .insertContentAt(range.from, [
                {
                  type: 'text',
                  text: 'BEFORE EMBED: ',
                },
                {
                  type: 'embed',
                  attrs: {
                    id: match,
                  },
                  text: 'EMBED',
                },
                {
                  type: 'text',
                  text: ' : AFTER EMBED',
                },
              ])
              .run()
          }
        },
      }),
    ]
  },
  addProseMirrorPlugins() {
    return [new Plugin({})]
  },
})
