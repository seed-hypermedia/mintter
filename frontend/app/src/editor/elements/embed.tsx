import {isEmbed} from '@mintter/mttast'
import {styled} from '@mintter/ui/stitches.config'
import {paragraph, statement, text} from '@mintter/mttast-builder'
import {nanoid} from 'nanoid'
import type {EditorPlugin} from '../types'
import {lazy, Suspense, useCallback, useMemo} from 'react'
import {Node} from 'slate'
import {getDraft} from 'frontend/client/src/drafts'

export const ELEMENT_EMBED = 'embed'

export const Embed = styled('q', {
  // paddingVertical: '$1',
  // paddingHorizontal: '$3',
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
  configureEditor(editor) {
    const {isVoid} = editor

    editor.isVoid = (node) => isEmbed(node) || isVoid(node)

    return editor
  },
  renderElement({attributes, children, element}) {
    if (isEmbed(element)) {
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const AsyncEmbed = useCallback(
        lazy(async () => {
          const document = await getDraft(element.url || '')
          const data = JSON.parse(document.content)

          return {
            default: function AsyncEmbed() {
              return (
                <span contentEditable={false}>
                  <span>{Node.string(data)}</span>
                </span>
              )
            },
          }
        }),
        [element.url],
      )

      return (
        <Embed cite={element.url} {...attributes}>
          <Suspense fallback={''}>
            <AsyncEmbed />
          </Suspense>
          {children}
        </Embed>
      )
    }
  },
})
