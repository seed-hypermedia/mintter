import {Editor, mergeAttributes, textblockTypeInputRule} from '@tiptap/core'
import {Plugin, PluginKey, TextSelection} from '@tiptap/pm/state'
import {createTipTapBlock, getBlockInfoFromPos, mergeCSSClasses} from '.'
import styles from '@/blocknote/core/extensions/Blocks/nodes/Block.module.css'
import {Fragment, Slice} from '@tiptap/pm/model'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    codeBlock: {
      /**
       * Set a code block
       */
      setCodeBlock: (attributes?: {language: string}) => ReturnType
      /**
       * Toggle a code block
       */
      toggleCodeBlock: (attributes?: {language: string}) => ReturnType
    }
  }
}

export const backtickInputRegex = /^```([a-z]+)?[\s\n]$/
export const tildeInputRegex = /^~~~([a-z]+)?[\s\n]$/

export const CodeBlock = createTipTapBlock<'codeBlock'>({
  name: 'codeBlock',

  content: 'text*',

  marks: '',

  code: true,

  defining: true,

  addAttributes() {
    return {
      language: {
        default: '',
        // parseHTML: (element) => {
        //   const {languageClassPrefix} = this.options
        //   const classNames = [...(element.firstElementChild?.classList || [])]
        //   const languages = classNames
        //     .filter((className) => className.startsWith(languageClassPrefix))
        //     .map((className) => className.replace(languageClassPrefix, ''))
        //   const language = languages[0]

        //   if (!language) {
        //     return ''
        //   }

        //   return language
        // },
        rendered: false,
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'pre',
        preserveWhitespace: 'full',
      },
    ]
  },

  renderHTML({HTMLAttributes}) {
    const blockContentDOMAttributes =
      this.options.domAttributes?.blockContent || {}
    const inlineContentDOMAttributes =
      this.options.domAttributes?.inlineContent || {}

    return [
      'pre',
      mergeAttributes(HTMLAttributes, {
        ...blockContentDOMAttributes,
        class: mergeCSSClasses(
          styles.blockContent,
          blockContentDOMAttributes.class,
        ),
        'data-content-type': this.name,
        'data-language': HTMLAttributes.language,
      }),
      [
        'code',
        {
          ...inlineContentDOMAttributes,
          class: mergeCSSClasses(
            styles.inlineContent,
            inlineContentDOMAttributes.class,
          ),
        },
        0,
      ],
    ]
  },

  addCommands() {
    return {
      setCodeBlock:
        (attributes) =>
        ({commands}) => {
          return commands.setNode(this.name, attributes)
        },
      toggleCodeBlock:
        (attributes) =>
        ({commands}) => {
          return commands.toggleNode(this.name, 'paragraph', attributes)
        },
    }
  },

  addKeyboardShortcuts() {
    function splitCodeBlock(editor: Editor) {
      const {state} = editor
      const codePos = state.doc.resolve(state.selection.$from.pos)
      const blockInfo = getBlockInfoFromPos(state.doc, codePos.pos)
      if (blockInfo === undefined) {
        return false
      }

      const {depth} = blockInfo

      const originalBlockContent = state.doc.cut(codePos.start(), codePos.pos)
      const newBlockContent = state.doc.cut(codePos.pos, codePos.end())

      const newBlock = state.schema.nodes['blockContainer'].createAndFill()!
      const nextBlockPos = codePos.end() + 2
      const nextBlockContentPos = nextBlockPos + 2

      let tr = state.tr
      tr = tr.insert(nextBlockPos, newBlock)
      tr = tr.replace(
        nextBlockContentPos,
        nextBlockContentPos + 1,
        newBlockContent.content.size > 0
          ? new Slice(Fragment.from(newBlockContent), depth + 2, depth + 2)
          : undefined,
      )
      tr = tr.replace(
        codePos.start(),
        codePos.end(),
        originalBlockContent.content.size > 0
          ? new Slice(Fragment.from(originalBlockContent), depth + 2, depth + 2)
          : undefined,
      )

      editor.view.dispatch(tr)

      editor.commands.setTextSelection(
        nextBlockContentPos - newBlockContent.textContent?.length,
      )

      return true
    }

    return {
      'Mod-Alt-c': () => this.editor.commands.toggleCodeBlock(),

      'Shift-Enter': ({editor}) => splitCodeBlock(editor),
      'Mod-Enter': ({editor}) => splitCodeBlock(editor),

      // remove code block when at start of document or code block is empty
      Backspace: () => {
        const {empty, $anchor} = this.editor.state.selection
        const isAtStart = $anchor.pos === 1

        if (!empty || $anchor.parent.type.name !== this.name) {
          return false
        }

        if (isAtStart || !$anchor.parent.textContent.length) {
          return this.editor.commands.clearNodes()
        }

        return false
      },

      // Tab: ({editor}) => {
      //   const {state, view} = editor
      //   const {selection} = state
      //   const {$from, empty} = selection

      //   if (!empty || $from.parent.type !== this.type) {
      //     return false
      //   }

      //   let tr = state.tr
      //   const tabSpace = state.schema.text('\t')
      //   tr = tr.replaceSelectionWith(tabSpace)
      //   view.dispatch(tr)
      //   return true
      // },

      // exit node on if at end of the block and at the new line or add a new line
      Enter: ({editor}) => {
        const {state, view} = editor
        const {selection} = state
        const {$from, empty} = selection

        if (!empty || $from.parent.type !== this.type) {
          return false
        }

        const codePos = state.doc.resolve($from.pos)
        const codeBlock = codePos.parent
        const isAtEnd = codePos.parentOffset === codeBlock.nodeSize - 2
        const endsWithNewline = codeBlock.textContent.endsWith('\n')
        if (isAtEnd && endsWithNewline) {
          const nextBlockPos = codePos.end() + 2
          editor
            .chain()
            .focus(nextBlockPos)
            .command(({tr}) => {
              tr.delete($from.pos - 1, $from.pos)
              return true
            })
            .run()

          return true
        }
        let tr = state.tr
        tr = tr.replaceSelectionWith(state.schema.text('\n'))
        view.dispatch(tr)
        return true
      },

      // exit node on arrow down
      ArrowDown: ({editor}) => {
        const {state} = editor
        const {selection, doc} = state
        const {$from, empty} = selection

        if (!empty || $from.parent.type !== this.type) {
          return false
        }

        const isAtEnd = $from.parentOffset === $from.parent.nodeSize - 2

        if (!isAtEnd) {
          return false
        }

        const after = $from.after()

        if (after === undefined) {
          return false
        }

        const nodeAfter = doc.nodeAt(after)

        if (nodeAfter) {
          return false
        }

        return editor.commands.exitCode()
      },
    }
  },

  addInputRules() {
    return [
      textblockTypeInputRule({
        find: backtickInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: match[1],
        }),
      }),
      textblockTypeInputRule({
        find: tildeInputRegex,
        type: this.type,
        getAttributes: (match) => ({
          language: match[1],
        }),
      }),
    ]
  },

  addProseMirrorPlugins() {
    return [
      // this plugin creates a code block for pasted content from VS Code
      // we can also detect the copied code language
      new Plugin({
        key: new PluginKey('codeBlockVSCodeHandler'),
        props: {
          handlePaste: (view, event) => {
            if (!event.clipboardData) {
              return false
            }

            // don’t create a new code block within code blocks
            if (this.editor.isActive(this.type.name)) {
              return false
            }

            const text = event.clipboardData.getData('text/plain')
            const vscode = event.clipboardData.getData('vscode-editor-data')
            const vscodeData = vscode ? JSON.parse(vscode) : undefined
            const language = vscodeData?.mode

            if (!text || !language) {
              return false
            }

            const {tr} = view.state
            const {selection} = view.state
            const {$from, $to} = selection

            // create an empty code block
            tr.replaceWith(
              $from.before($from.depth),
              $to.pos,
              this.type.create({language}),
            )

            // put cursor inside the newly created code block
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(Math.max(0, $from.pos - 2))),
            )

            // add text to code block
            // strip carriage return chars from text pasted as code
            // see: https://github.com/ProseMirror/prosemirror-view/commit/a50a6bcceb4ce52ac8fcc6162488d8875613aacd
            tr.insertText(text.replace(/\r\n?/g, '\n'))

            // store meta information
            // this is useful for other plugins that depends on the paste event
            // like the paste rule plugin
            tr.setMeta('paste', true)

            view.dispatch(tr)

            return true
          },
        },
      }),
    ]
  },
})
