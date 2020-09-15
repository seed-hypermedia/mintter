import React, {useReducer, useCallback, useState} from 'react'
import {Editor as SlateEditor, Transforms, Node, Range} from 'slate'
import {Slate, ReactEditor} from 'slate-react'
import {
  Icons,
  nodeTypes,
  Editor,
  useEditor,
  plugins as editorPlugins,
  initialBlocksValue,
  EditorComponent,
  renderReadOnlyBlockElement,
  renderElementReadOnlyBlockList,
  useEditorValue,
  toSlateTree,
  options,
  ELEMENT_BLOCK,
  ELEMENT_BLOCK_LIST,
  ELEMENT_TRANSCLUSION,
  ELEMENT_PARAGRAPH,
  toBlock,
  toDocument,
  SlateBlock,
} from '@mintter/editor'
import Seo from 'components/seo'
import EditorHeader from 'components/editor-header'
import {DebugValue} from 'components/debug'
import {css} from 'emotion'
import {useParams, useHistory} from 'react-router-dom'
import {markdownToSlate} from 'shared/markdownToSlate'
import {useMintter} from 'shared/mintterContext'
import {useProfile} from 'shared/profileContext'
import Layout from 'components/layout'
import {FullPageSpinner} from 'components/fullPageSpinner'
import {ErrorMessage} from 'components/errorMessage'
import {AuthorLabel} from 'components/author-label'
import Container from 'components/container'
import {
  UpdateDraftRequest,
  BlockRefList,
  Block,
} from '@mintter/proto/v2/documents_pb'
import {v4 as uuid} from 'uuid'
import {tempUpdateDraft} from 'shared/mintterClient'

export default function Publication(): JSX.Element {
  const plugins = [...editorPlugins]
  const editor: ReactEditor = useEditor(plugins) as ReactEditor

  const {getDocument, getAuthor, createDraft} = useMintter()
  const {push} = useHistory()
  const {version} = useParams()

  const {status, error, data, isFetching, failureCount} = getDocument(version)
  const {state, setValue} = useEditorValue({
    document: data,
  })
  const {title, blocks, subtitle, author: pubAuthor} = state
  const author = getAuthor(pubAuthor)

  async function createTransclusion(block: SlateBlock) {
    console.log('create transclusion called!!', block)
    const n = await createDraft()
    const newDraft = n.toObject()

    const transclusionId = `${version}/${block.id}`

    const req = new UpdateDraftRequest()
    const map: Map<string, Block> = req.getBlocksMap()

    const emptyBlockId = uuid()
    const emptyBlock = {
      type: ELEMENT_BLOCK,
      id: emptyBlockId,
      children: [
        {
          type: ELEMENT_PARAGRAPH,
          children: [
            {
              text: '',
            },
          ],
        },
      ],
    }

    map.set(emptyBlockId, toBlock(emptyBlock))

    const update = toDocument({
      document: {
        id: newDraft.id,
        author: newDraft.author,
        version: newDraft.version,
      },
      state: {
        title: '',
        subtitle: '',
        blocks: [
          {
            type: ELEMENT_BLOCK_LIST,
            id: uuid(),
            listType: BlockRefList.Style.NONE,
            children: [
              {
                type: ELEMENT_TRANSCLUSION,
                id: transclusionId,
                children: block.children,
              },
              {
                ...emptyBlock,
              },
            ],
          },
        ],
      },
    })

    req.setDocument(update)

    await tempUpdateDraft(req)

    push({
      pathname: `/editor/${newDraft.version}`,
    })
  }

  let content

  if (status === 'loading') {
    content = <p>Loading...</p>
  } else if (status === 'error') {
    content = (
      <div className="mx-8">
        <ErrorMessage error={error} />
      </div>
    )
  } else {
    content = (
      <>
        <div
          className={`pb-2 relative ${css`
            &:after {
              content: '';
              position: absolute;
              bottom: 1px;
              left: 0;
              width: 50%;
              max-width: 360px;
              height: 1px;
              z-index: 20;
              background-color: var(--color-muted-hover);
            }
          `}`}
        >
          <h1
            className={`text-4xl text-heading font-bold italic ${css`
              word-wrap: break-word;
              white-space: pre-wrap;
              min-height: 56px;
            `}`}
          >
            {title}
          </h1>
          <p
            className={`leading-relaxed text-lg font-light text-heading-muted italic mt-4 ${css`
              word-wrap: break-word;
              white-space: pre-wrap;
              min-height: 28px;
            `}`}
          >
            {subtitle}
          </p>
          <p className=" text-sm mt-4 text-heading">
            <span>by </span>

            <AuthorLabel author={author} />
          </p>
        </div>
        <EditorComponent
          readOnly
          editor={editor}
          plugins={plugins}
          value={blocks}
          onChange={() => {}}
          renderElements={[
            renderReadOnlyBlockElement(options, {createTransclusion}),
            renderElementReadOnlyBlockList(),
          ]}
        />
      </>
    )
  }

  return (
    <>
      <Seo title="Publication" />
      <div
        className={`${css`
          display: grid;

          grid-template: auto 1fr / minmax(250px, 20%) 1fr minmax(250px, 20%);
          grid-gap: 1rem;
        `}`}
      >
        <div
          className={`p-4 ${css`
            grid-column: 2/3;
          `}`}
        >
          <div
            className={`my-0 mx-auto ${css`
              max-width: 64ch;
              width: 100%;
            `}`}
          >
            {content}
          </div>
        </div>
      </div>
    </>
  )
}
