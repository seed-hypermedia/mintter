import { Extension } from '@tiptap/core'
import { DOMParser as ProseMirrorDOMParser } from '@tiptap/pm/model'
import { Plugin } from 'prosemirror-state'
import rehypeStringify from 'rehype-stringify'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

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

            if (
              pastedHtml &&
              !isMarkdown(pastedText)
            ) {
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

                tr.replaceWith($from.before($from.depth), $to.pos, fragment.firstChild!.content)

                view.dispatch(tr)
                return true
              })
              .catch((error) => {
                console.error('Failed to parse as Markdown:', error)
              })

            // if (pastedText) {
            //   // console.log(isMarkdown)
            //   // if (isMarkdown) {
            //   //   // Handle Markdown content
            //   //   unified()
            //   //     .use(remarkParse)
            //   //     .use(remarkRehype)
            //   //     .use(rehypeStringify)
            //   //     .process(pastedText)
            //   //     .then((file) => {
            //   //       const htmlFromMarkdown = file.value.toString()
            //   //       return unified()
            //   //         .use(rehypeParse, {fragment: true})
            //   //         .process(htmlFromMarkdown)
            //   //     })
            //   //     .then((file) => {
            //   //       const parser = new DOMParser()
            //   //       // console.log(file.value)
            //   //       const doc = parser.parseFromString(
            //   //         file.value.toString(),
            //   //         'text/html',
            //   //       )
            //   //       const fragment = ProseMirrorDOMParser.fromSchema(
            //   //         view.state.schema,
            //   //       ).parse(doc.body)
            //   //       // const transaction = view.state.tr.replaceSelectionWith(fragment)
            //   //       // view.dispatch(transaction)
            //   //       console.log(doc, fragment)
            //   //     })
            //   //     .catch((error) => {
            //   //       console.error('Failed to parse Markdown:', error)
            //   //     })
            //   //   return true
            //   // }
            // }

            // if (pastedHtml) {
            //   // Handle pastedHtml content
            //   unified()
            //     .use(rehypeParse, {fragment: true})
            //     .process(pastedHtml)
            //     .then((file) => {
            //       const parser = new DOMParser()
            //       // console.log(file.value)
            //       const doc = parser.parseFromString(
            //         file.value.toString(),
            //         'text/html',
            //       )
            //       const fragment = ProseMirrorDOMParser.fromSchema(
            //         view.state.schema,
            //       ).parse(doc.body)
            //       console.log(doc, fragment)
            //       // const transaction = view.state.tr.replaceSelectionWith(fragment)
            //       // view.dispatch(transaction)
            //     })
            //     .catch((error) => {
            //       console.error('Failed to parse HTML:', error)
            //     })

            //   return true
            // }

            // console.log('here', fragment)
            // slice.content.forEach((node) => {
            //   const html = marked(node.textContent) as string
            //   const doc = new DOMParser().parseFromString(html, 'text/html')
            //   // console.log(doc)
            //   const fragment = ProseMirrorDOMParser.fromSchema(
            //     view.state.schema,
            //   ).parse(doc.body)
            //   let parsedNode: Node | null = null
            //   fragment.descendants((descNode, pos) => {
            //     if (descNode.type.name !== 'doc') {
            //       if (descNode.type.name === 'blockGroup') {
            //         if (
            //           descNode.attrs.listType === 'ul' ||
            //           descNode.attrs.listType === 'ol'
            //         ) {
            //           parsedNode = descNode
            //           return false
            //         }
            //         return true
            //       } else {
            //         parsedNode = descNode
            //         return false
            //       }
            //     }
            //   })

            //   console.log(parsedNode)

            //   // const {tr} = view.state
            //   // const {selection} = view.state
            //   // const {$from, $to} = selection

            //   if (parsedNode) {
            //     // @ts-ignore
            //     if (parsedNode.type.name === 'blockGroup') {
            //       let lastNode = pastedNodes.pop()
            //       if (lastNode && lastNode.type.name === 'blockContainer') {
            //         const newNode = view.state.schema.nodes[
            //           'blockContainer'
            //         ].create(null, [lastNode.firstChild!, parsedNode])
            //         pastedNodes.push(newNode)
            //       }
            //     } else pastedNodes.push(parsedNode)
            //   }
            //   // return false
            // })
            // if (pastedNodes.length > 0) {
            //   const {tr} = view.state
            //   const {selection} = view.state
            //   const {$from, $to} = selection
            //   const pastedContent = view.state.schema.nodes[
            //     'blockGroup'
            //   ].create({listType: 'div'}, pastedNodes)!
            //   console.log(pastedContent)
            //   tr.replaceSelectionWith(pastedContent)
            //   view.dispatch(tr)
            //   return true
            // }

            return false
          },
        },
      }),
    ]
  },
})
