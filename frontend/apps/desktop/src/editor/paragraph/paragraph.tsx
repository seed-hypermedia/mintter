import {useDrag} from '@app/drag-context'
import {HIGHLIGHTER} from '@app/editor/code'
import {usePhrasingProps} from '@app/editor/editor-node-props'
import {findPath} from '@app/editor/utils'
import {
  useHoverVisibleConnection,
  useVisibleConnection,
} from '@app/editor/visible-connection'
import {send, useListen} from '@app/ipc'
import {useBlockObserve} from '@app/mouse-context'
import {mergeRefs} from '@app/utils/mege-refs'
import {
  Code as CodeType,
  FlowContent,
  isBlockquote,
  isCode,
  isFlowContent,
  isParagraph,
  isPhrasingContent,
  Paragraph as ParagraphType,
} from '@mintter/shared'
import {SizableText, XStack, YStack} from '@mintter/ui'
import {useMemo, useRef, useState} from 'react'
import {BUNDLED_LANGUAGES, Lang} from 'shiki'
import {Editor, Node, Path, Transforms} from 'slate'
import {
  ReactEditor,
  RenderElementProps,
  useSlate,
  useSlateStatic,
} from 'slate-react'
import {EditorMode} from '../plugin-utils'
import type {EditorPlugin} from '../types'

export const ELEMENT_PARAGRAPH = 'paragraph'

export const createParagraphPlugin = (): EditorPlugin => ({
  name: ELEMENT_PARAGRAPH,
  renderElement:
    (editor) =>
    ({element, children, attributes}) => {
      if (isParagraph(element)) {
        return (
          <Paragraph
            mode={editor.mode}
            element={element}
            attributes={attributes}
          >
            {children}
          </Paragraph>
        )
      }
    },
  configureEditor: (editor) => {
    const {normalizeNode} = editor

    editor.normalizeNode = (entry) => {
      const [node, path] = entry

      if (isParagraph(node)) {
        for (const [child, childPath] of Node.children(editor, path)) {
          if (!isPhrasingContent(child)) {
            console.log('moving phrasing content', child, childPath)
            Transforms.moveNodes(editor, {at: childPath, to: Path.next(path)})
            return
          }
        }
      }

      normalizeNode(entry)
    }

    return editor
  },
})

function Paragraph({
  children,
  element,
  attributes,
  mode,
}: RenderElementProps & {mode: EditorMode; element: ParagraphType}) {
  let editor = useSlate()
  let {elementProps, parentNode} = usePhrasingProps(editor, element)
  // dragProps
  let pRef = useRef<HTMLElement | undefined>()
  let {highlight} = useVisibleConnection(parentNode?.id)
  let hoverProps = useHoverVisibleConnection(parentNode?.id)

  let otherProps = {
    ref: mergeRefs([attributes.ref, pRef]),
    ...hoverProps,
  }
  let paddingLeft = useMemo(
    () => (elementProps['data-parent-group'] == 'group' ? '$2' : 0),
    [elementProps],
  )
  useBlockObserve(mode, pRef)

  if (mode == EditorMode.Embed) {
    return (
      <SizableText
        selectionColor="$color10"
        size="$5"
        tag="span"
        color="$color9"
        fontWeight="600"
        padding="$1"
        backgroundColor={highlight ? '$yellow3' : 'transparent'}
        // borderRadius="$2"
        // backgroundColor="$background"
        // hoverStyle={{
        //   backgroundColor: '$color9',
        //   color: '$background',
        // }}
        {...attributes}
        {...elementProps}
        {...otherProps}
      >
        {children}
      </SizableText>
    )
  }

  if (isCode(parentNode)) {
    return (
      <Code
        attributes={attributes}
        elementProps={elementProps}
        otherProps={otherProps}
        element={element}
        mode={mode}
      >
        {children}
      </Code>
    )
  }

  if (isBlockquote(parentNode)) {
    return (
      <Blockquote
        attributes={attributes}
        elementProps={elementProps}
        otherProps={otherProps}
        element={element}
        mode={mode}
      >
        {children}
      </Blockquote>
    )
  }

  return (
    <SizableText
      tag="p"
      size="$5"
      marginLeft={paddingLeft}
      {...attributes}
      {...elementProps}
      {...otherProps}
      // onDragOver={onDragOver}
    >
      {children}
    </SizableText>
  )
}

function Code({
  children,
  element,
  attributes,
  elementProps,
  otherProps,
  mode,
  paddingLeft,
}: any) {
  let editor = useSlateStatic()
  let path = findPath(element)
  let lang = (element as CodeType).lang || ''

  function setLanguage(lang: any) {
    const {...newData} = (element as CodeType).data || {}
    delete newData[HIGHLIGHTER]

    Transforms.setNodes(editor, {lang, data: newData}, {at: path})
  }

  return (
    <YStack
      tag="pre"
      {...attributes}
      {...elementProps}
      {...otherProps}
      padding="$4"
      borderRadius="$4"
      margin={0}
      elevation="$2"
      marginLeft={paddingLeft}
    >
      <SizableText
        size="$5"
        tag="code"
        fontFamily="$mono"
        wordWrap="break-word"
        whiteSpace="break-spaces"
      >
        {children}
      </SizableText>
      {mode == EditorMode.Draft ? (
        <XStack
          //@ts-ignore
          contentEditable={false}
          position="absolute"
          top={-12}
          right={-8}
        >
          <select
            id="lang-selection"
            name="lang-selection"
            value={lang}
            onChange={(e) => setLanguage(e.target.value as Lang)}
          >
            <option value="">Select a Language</option>
            {BUNDLED_LANGUAGES.map((lang) => (
              <option value={lang.id} key={lang.id}>
                {lang.id}
              </option>
            ))}
          </select>
        </XStack>
      ) : null}
    </YStack>
  )
}

function Blockquote({
  children,
  attributes,
  elementProps,
  otherProps,
  paddingLeft,
}: any) {
  return (
    <YStack
      tag="blockquote"
      {...attributes}
      {...elementProps}
      {...otherProps}
      padding="$2"
      paddingLeft="$4"
      margin={0}
      marginLeft={paddingLeft}
      borderLeftWidth={5}
      borderLeftColor="$color6"
    >
      <SizableText size="$7" fontWeight="500" color="$color9">
        {children}
      </SizableText>
    </YStack>
  )
}
