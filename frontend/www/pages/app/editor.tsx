import React from 'react'

import {Transforms, Node, Range} from 'slate'
import {Slate, ReactEditor} from 'slate-react'
import {Editor, Toolbar, plugins as editorPlugins} from '@mintter/editor'
import { EditablePlugins } from 'slate-plugins-next'
import Seo from '../../components/seo'
import Leaf from '../../components/leaf'
import Element from '../../components/elements'
import useCustomEditor from '../../components/useEditor'
import EditorHeader from '../../components/editor-header'
import {DebugValue} from '../../components/debug'
import {css} from 'emotion'

// import {wrapLink, unwrapLink} from '@mintter/slate-plugin-with-links'
import Textarea from '../../components/textarea'
import Layout from '../../components/layout'
import {PARAGRAPH} from 'slate-plugins-next'

const initialValue = [
  {
    type: PARAGRAPH,
    children: [
      {
        text: '',
      },
    ],
  },
]

export default function EditorPage(): JSX.Element {
  const plugins = [
    ...editorPlugins
  ]
  const editor = useCustomEditor(plugins) as ReactEditor
  const [value, setValue] = React.useState<Node[]>(initialValue)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const [title, setTitle] = React.useState<string>('')
  const [description, setDescription] = React.useState<string>('')

  const renderElement = React.useCallback(props => <Element {...props} />, [])
  const renderLeaf = React.useCallback(props => <Leaf {...props} />, [])

  // send focus to the editor when you click outside.
  // TODO: check if focus is on title or description
  React.useEffect(() => {
    function wrapperClick(e) {
      if (
        !ReactEditor.isFocused(editor) &&
        typeof e.target.value !== 'string'
      ) {
        ReactEditor.focus(editor)
        Transforms.select(editor, Editor.end(editor, []))
      }
    }

    wrapperRef.current.addEventListener('click', wrapperClick)

    return () => {
      wrapperRef.current.removeEventListener('click', wrapperClick)
    }
  }, [])

  const onKeyDown = React.useCallback(event => {
    withSoftBreak(editor, event)
  }, [])

  return (
    <Layout className="flex">
      <Seo title="Editor | Mintter" />

      <div
        className="flex-1 overflow-y-auto pt-4 overflow-y-scroll"
        ref={wrapperRef}
      >
        <EditorHeader />
        <div className="flex pt-8 pb-32 relative">
          <DebugValue
            value={{title, description, value}}
            className="absolute z-10 right-0 top-0 w-full max-w-xs"
          />
          <div
            className={`w-full pr-4 absolute xl:sticky left-0 top-0 self-start mx-4 opacity-0 pointer-events-none xl:opacity-100 xl:pointer-events-auto transition duration-200 ${css`
              max-width: 300px;
            `}`}
          >
            <div className="">
              <p className="font-semibold text-heading text-xl">
                {title || 'Untitled document'}
              </p>
            </div>
          </div>
          <div
            className={`flex-1 ${css`
              @media (min-width: 1280px) {
                transform: translateX(-150px);
              }
            `}`}
          >
            <div
              className={`mx-auto px-4 ${css`
                max-width: 80ch;
              `} `}
            >
              <Slate
                editor={editor}
                value={value}
                onChange={value => {
                  setValue(value)
                }}
              >
                <div
                  className={`${css`
                    word-break: break-word;
                  `}`}
                >
                  <div
                    className={`mb-12 pb-2 relative ${css`
                      &:after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        left: 0;
                        width: 50%;
                        max-width: 360px;
                        height: 1px;
                        z-index: 20;
                        background-color: var(--color-muted-hover);
                      }
                    `}`}
                  >
                    <Textarea
                      value={title}
                      onChange={t => setTitle(t)}
                      placeholder="Untitled document"
                      className={`text-4xl text-heading font-bold leading-10 ${css`
                        min-height: 56px;
                      `}`}
                    />
                    <Textarea
                      value={description}
                      placeholder="+ Add a subtitle"
                      onChange={t => setDescription(t)}
                      className={`text-lg font-light text-heading-muted italic ${css`
                        min-height: 28px;
                      `}`}
                    />
                  </div>
                  <Toolbar />
                  <EditablePlugins
                    plugins={plugins}
                    renderElement={[renderElement]}
                    renderLeaf={[renderLeaf]}
                    placeholder="Start writing your masterpiece..."
                    onKeyDown={[onKeyDown]}
                    spellCheck
                    autoFocus
                  />
                </div>
              </Slate>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

function withSoftBreak(editor: ReactEditor, event) {
  if (
    event.key === 'Enter' &&
    event.shiftKey &&
    editor.selection &&
    Range.isCollapsed(editor.selection)
  ) {
    console.log('entro en shift enter!')
    event.preventDefault()
    editor.insertText('\n')
  }
}
