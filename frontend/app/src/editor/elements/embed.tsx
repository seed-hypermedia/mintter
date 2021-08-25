import type {Embed as EmbedType, Statement} from '@mintter/mttast'
import type {EditorPlugin} from '../types'
import type {MTTEditor} from '../utils'
import {styled} from '@mintter/ui/stitches.config'
import {createId, paragraph, statement, text} from '@mintter/mttast-builder'
import {useQuery} from 'react-query'
import {ReactEditor, useSlateStatic} from 'slate-react'
import {useEffect} from 'react'
import {ELEMENT_STATEMENT} from './statement'
import {Editor, Transforms} from 'slate'
import {useRef} from 'react'

export const ELEMENT_EMBED = 'embed'

export const Embed = styled('q', {
  borderRadius: '$1',
  transition: 'all ease-in-out 0.1s',
  '&:hover': {
    backgroundColor: '$secondary-softer',
    cursor: 'pointer',
  },
  '&::before, &::after': {
    fontWeight: '$bold',
    fontSize: '$5',
  },
  '&::before': {
    content: '[',
  },
  '&::after': {
    content: ']',
  },
})

export const createEmbedPlugin = (): EditorPlugin => ({
  name: ELEMENT_EMBED,
  renderElement({attributes, children, element}) {
    const editor = useSlateStatic()
    useEmbed(editor, element)

    if (element.type == ELEMENT_EMBED) {
      return (
        <Embed data-element-type={element.type} cite={(element as EmbedType).url} {...attributes}>
          {children}
        </Embed>
      )
    }
  },
  // configureEditor(editor: MTTEditor) {
  //   const {insertText, isVoid} = editor

  //   // editor.isVoid = (element) => (element.type == ELEMENT_EMBED ? true : isVoid(element))

  //   editor.insertText = (text) => {
  //     console.log('insertText: ', text, editor.selection)

  //     insertText(text)
  //   }
  // },
})

function useEmbed(editor: MTTEditor, element: EmbedType) {
  const embedPath = ReactEditor.findPath(editor, element)
  const rendered = useRef(false)
  const embedQuery = useQuery<Statement>(['Embed', element.url], async () => {
    return await new Promise((resolve, reject) => {
      const result = statement({id: createId()}, [paragraph([text('hello from embed')])])

      setTimeout(() => {
        resolve(result)
      }, Math.random() * 2000)
    })
  })

  useEffect(() => {
    if (!rendered.currente && element.type == ELEMENT_EMBED && embedQuery.data && embedQuery.status == 'success') {
      const paragraph = (embedQuery.data as Statement).children[0]
      if (embedQuery.data.type == ELEMENT_STATEMENT) {
        if (!rendered.current) {
          rendered.current = true
          console.log(embedQuery, embedPath)
          // Editor.withoutNormalizing(editor, () => {})
          Transforms.insertFragment(editor, paragraph.children, {at: Editor.end(editor, embedPath)})
          Transforms.removeNodes(editor, {at: [...embedPath, 0]})
        }
      }
    }
  }, [embedQuery.data])
}
