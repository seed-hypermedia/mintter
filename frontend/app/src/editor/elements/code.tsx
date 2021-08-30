import type {IThemeRegistration} from 'shiki'
import type {EditorPlugin} from '../types'
import type {MTTEditor} from '../utils'
import type {NodeEntry} from 'slate'
import {setCDN, getHighlighter} from 'shiki'
import {Icon} from '@mintter/ui/icon'
import {Box} from '@mintter/ui/box'
import {styled} from '@mintter/ui/stitches.config'
import {Marker} from '../marker'
import {Dragger, Tools} from './statement'
import {isCode, isText} from '@mintter/mttast'
import {Node, Range, Editor, Element} from 'slate'
import {MARK_EMPHASIS} from '../leafs/emphasis'
import {MARK_STRONG} from '../leafs/strong'
import {MARK_UNDERLINE} from '../leafs/underline'

export const ELEMENT_CODE = 'code'

export const Code = styled('pre', {
  margin: 0,
  padding: 0,
  marginTop: '$3',
  marginHorizontal: '-$8',
  display: 'grid',
  gridTemplateColumns: '$space$8 1fr',
  gridTemplateRows: 'min-content auto',
  gap: '0 $2',
  borderRadius: '$3',
  gridTemplateAreas: `"controls content"
  ". children"`,
  [`& > ${Tools}`]: {
    gridArea: 'controls',
  },

  "& > [data-element-type='paragraph']": {
    gridArea: 'content',
  },
  '& > ul, & > ol': {
    gridArea: 'children',
  },
})

interface CodePluginProps {
  theme?: IThemeRegistration
}

export const createCodePlugin = async (props: CodePluginProps = {}): Promise<EditorPlugin> => {
  const {theme = 'github-dark'} = props

  setCDN('/shiki/')

  const highlighter = await getHighlighter({
    theme,
  })
  let editor: MTTEditor

  return {
    name: ELEMENT_CODE,
    configureEditor(e) {
      editor = e
      return e
    },
    renderElement({attributes, children, element}) {
      if (isCode(element)) {
        console.log('CODE HERE!', element)
        return (
          <Code data-element-type={element.type} {...attributes}>
            <Tools contentEditable={false}>
              <Dragger data-dragger>
                <Icon name="Grid6" size="2" color="muted" />
              </Dragger>
              <Marker element={element} />
            </Tools>
            <Box
              as="code"
              css={{
                backgroundColor: '$background-muted',
                padding: '$7',
                borderRadius: '$2',
                overflow: 'hidden',
                position: 'relative',
                color: highlighter.getForegroundColor(theme as string),
                caretColor: highlighter.getForegroundColor(theme as string),
                // backgroundColor: highlighter.getBackgroundColor(theme as string),
              }}
            >
              {children}
            </Box>
          </Code>
        )
      }
    },
    renderLeaf({attributes, children, leaf}) {
      if (leaf.data?.color) {
        return (
          <span style={{color: leaf.data.color as string}} {...attributes}>
            {children}
          </span>
        )
      }
    },
    decorate([node, nodePath]) {
      const ranges: Array<Range> = []
      // if (!editor) return
      // if (isText(node)) {
      //   console.log({node})
      //   // const [parentNode, parentPath] = Editor.above(editor, {
      //   //   match: (n) => Element.isElement(n) && isCode(n),
      //   // })
      //   // console.log('parentNode', parentNode, parentPath)
      // }
      if (isCode(node)) {
        for (const [text, textPath] of Node.texts(node)) {
          const [tokens] = highlighter.codeToThemedTokens(text.value, node.lang)
          console.log('🚀 ~ tokens', tokens)
          let offset = 0

          tokens.forEach((token, i) => {
            if (i != 0) {
              const range: Range & Record<string, unknown> = {
                anchor: {path: [...nodePath, ...textPath], offset},
                focus: {path: [...nodePath, ...textPath], offset: offset + token.content.length},
                data: {
                  color: token.color,
                },
              }

              if (token.fontStyle === 1) range[MARK_EMPHASIS] = true
              if (token.fontStyle === 2) range[MARK_STRONG] = true
              if (token.fontStyle === 4) range[MARK_UNDERLINE] = true

              console.log({ranges, range})
              ranges.push(range)
            }

            offset += token.content.length
          })
        }
      }

      return ranges
    },
  }
}

// export const createCodeBlockPlugin = (): EditorPlugin => ({
//   name: ELEMENT_CODE,
//   renderElement({attributes, children, element}) {
//     if (element.type === ELEMENT_CODE) {
//       return (
//         <CodeBlock data-element-type={element.type} {...attributes}>
//           <Tools contentEditable={false}>
//             <Dragger data-dragger>
//               <Icon name="Grid6" size="2" color="muted" />
//             </Dragger>
//             <Marker element={element} />
//           </Tools>
//           <Box
//             css={{
//               backgroundColor: '$background-muted',
//               padding: '$7',
//               borderRadius: '$2',
//               overflow: 'hidden',
//               position: 'relative',
//             }}
//           >
//             {children}
//           </Box>
//         </CodeBlock>
//       )
//     }
//   },
// })
