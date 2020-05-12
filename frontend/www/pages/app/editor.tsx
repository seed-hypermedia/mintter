import React from 'react'
import isHotkey from 'is-hotkey'
import {Editor as SlateEditor, Transforms, Node, Range} from 'slate'
import {Slate, ReactEditor} from 'slate-react'
import {Icons} from '@mintter/editor'
import {
  Editor,
  Toolbar,
  useEditor,
  plugins as editorPlugins,
  initialValue,
  SectionToolbar,
} from '@mintter/editor'
import {
  EditablePlugins,
  SlatePlugin,
  renderLeafPreview,
} from 'slate-plugins-next'
import Seo from '../../components/seo'
import {
  renderLeafBold,
  renderLeafItalic,
  renderLeafUnderline,
  renderLeafInlineCode,
} from '../../components/leafs'
import renderElement from '../../components/elements'
import EditorHeader from '../../components/editor-header'
import {DebugValue} from '../../components/debug'
import {css} from 'emotion'

// import {wrapLink, unwrapLink} from '@mintter/slate-plugin-with-links'
import Textarea from '../../components/textarea'
import Layout from '../../components/layout'
import {publish} from '../../shared/publishDocument'
import {useRouter} from 'next/router'
import {useFetchDraft, useDraftAutosave} from '../../shared/drafts'
import {useForm} from 'react-hook-form'

export default function EditorPage(): JSX.Element {
  const plugins = [...editorPlugins, SoftBreakPlugin()]
  const editor: ReactEditor = useEditor(plugins) as ReactEditor
  const [value, setValue] = React.useState<Node[]>(initialValue)
  const wrapperRef = React.useRef<HTMLDivElement>(null)
  const editorContainerRef = React.useRef<HTMLDivElement>(null)
  const titleRef = React.useRef(null)
  const descriptionRef = React.useRef(null)
  const {register, setValue: setTitleAndDescription, watch} = useForm()
  const {
    query: {draftId},
  } = useRouter()

  // get draft data if draftId is avaliable
  const draft = useFetchDraft(draftId)

  // reading values to render it in the outliner
  const title = watch('title')
  const description = watch('description')

  // debounce auto-save values
  useDraftAutosave(draftId, title, description, value)

  // update values from draft data
  React.useEffect(() => {
    if (draft.status === 'success' && draft.data) {
      // console.log('se ejecuta el efecto!!', draft.data.toObject())
      const values = draft.data.toObject()
      console.log('draft', draft)
      console.log('values', values.sectionsList)

      const data = ['title', 'description'].map(v => ({[v]: values[v]}))
      setTitleAndDescription(data)
    }
  }, [draft.status])

  function isEmpty(): boolean {
    return value.length === 1 && Node.string(value[0]) === ''
  }

  // NO: create a new Draft?
  // save on throttle

  // send focus to the editor when you click outside.
  // TODO: check if focus is on title or description
  React.useEffect(() => {
    wrapperRef.current.addEventListener('click', wrapperClick)

    return () => {
      wrapperRef.current.removeEventListener('click', wrapperClick)
    }

    function wrapperClick(e) {
      if (
        !ReactEditor.isFocused(editor) &&
        typeof e.target.value !== 'string'
      ) {
        ReactEditor.focus(editor)
        Transforms.select(editor, Editor.end(editor, []))
      }
    }
  }, [])

  return (
    <Layout className="flex">
      <Seo title="Editor | Mintter" />

      <div
        className="flex-1 overflow-y-auto pt-4 overflow-y-scroll"
        ref={wrapperRef}
      >
        <EditorHeader onPublish={() => publish(value)} />
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
              className={`mx-auto ${css`
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
                    className={`mb-12 mx-8 pb-2 relative ${css`
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
                      ref={t => {
                        titleRef.current = t
                        register(t)
                      }}
                      name="title"
                      placeholder="Untitled document"
                      minHeight={56}
                      className={`text-4xl text-heading font-bold leading-10`}
                      onEnterPress={() => {
                        descriptionRef.current.focus()
                      }}
                    />
                    <Textarea
                      ref={d => {
                        descriptionRef.current = d
                        register(d)
                      }}
                      name="description"
                      placeholder="+ Add a subtitle"
                      minHeight={28}
                      className={`text-lg font-light text-heading-muted italic`}
                      onEnterPress={() => {
                        ReactEditor.focus(editor)
                      }}
                    />
                  </div>
                  <div className="relative" ref={editorContainerRef}>
                    <Toolbar />
                    {!isEmpty() && <SectionToolbar />}
                    <EditablePlugins
                      plugins={plugins}
                      renderElement={[renderElement]}
                      renderLeaf={[
                        renderLeafBold(),
                        renderLeafItalic(),
                        renderLeafUnderline(),
                        renderLeafInlineCode(),
                        renderLeafPreview(),
                      ]}
                      placeholder="Start writing your masterpiece..."
                      spellCheck
                      autoFocus
                    />
                  </div>
                </div>
              </Slate>
              <div className="py-16 px-8 flex flex-col items-start">
                <button
                  className="flex items-center bg-transparent text-body-muted transition duration-200 hover:text-body hover:border-body border border-body-muted rounded-md px-2 pl-2 py-2"
                  onClick={() => Editor.addSection(editor)}
                >
                  <Icons.Plus color="currentColor" />
                  <span className="px-2 text-sm">add section</span>
                </button>
                <a className="text-primary hover:text-primary-hover cursor-pointer text-sm mt-4 underline">
                  what are sections and how to use them
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

const SoftBreakPlugin = (): SlatePlugin => ({
  onKeyDown: onKeyDownSoftBreak(),
})

const onKeyDownSoftBreak = () => (e: KeyboardEvent, editor: SlateEditor) => {
  if (
    isHotkey('shift+enter', e) &&
    editor.selection &&
    Range.isCollapsed(editor.selection)
  ) {
    e.preventDefault()
    editor.insertText('\n')
  }
}
