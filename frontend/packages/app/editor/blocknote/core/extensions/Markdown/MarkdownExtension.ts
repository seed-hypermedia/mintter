import {Extension} from '@tiptap/core'
import {DOMParser as ProseMirrorDOMParser} from '@tiptap/pm/model'
import {Plugin} from 'prosemirror-state'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import {unified} from 'unified'

const markdownRegex = new RegExp(
  [
    '^#{1,6} .+', // Headers
    '(\\*\\*|__)(.*?)\\1|(\\*|_)(.*?)\\3', // Bold/Italic
    '\\[([^\\]]+)\\]\\(([^)]+)\\)', // Links
    '!\\[([^\\]]*)\\]\\(([^)]+)\\)', // Images
    '`([^`]+)`', // Inline Code
    '^[-+*] .+', // Unordered Lists
    '^\\d+\\. .+', // Ordered Lists
    '^```[a-zA-Z]*\\n[\\s\\S]*?\\n```', // Code Blocks
  ].join('|'),
  'gm',
)

function isMarkdown(text) {
  return markdownRegex.test(text)
}

export const MarkdownExtension = Extension.create({
  name: 'MarkdownPasteHandler',
  priority: 99999,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        props: {
          handlePaste: (view, event, slice) => {
            const pastedText = event.clipboardData!.getData('text/plain')
            const pastedHtml = event.clipboardData!.getData('text/html')

            if (pastedHtml && !isMarkdown(pastedText)) {
              return false
            }

            unified()
              .use(remarkParse)
              .use(remarkRehype)
              .use(rehypeStringify)
              .process(pastedText)
              .then((file) => {
                const parser = new DOMParser()
                const doc = parser.parseFromString(
                  file.value.toString(),
                  'text/html',
                )
                const fragment = ProseMirrorDOMParser.fromSchema(
                  view.state.schema,
                ).parse(doc.body)

                const {tr} = view.state
                const {selection} = view.state
                const {$from, $to} = selection

                tr.replaceWith(
                  $from.before($from.depth),
                  $to.pos,
                  fragment.firstChild!.content,
                )

                view.dispatch(tr)
                return true
              })
              .catch((error) => {
                console.error('Failed to parse as Markdown:', error)
              })

            return false
          },
        },
      }),
    ]
  },
})
