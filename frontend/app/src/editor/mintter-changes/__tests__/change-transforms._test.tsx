/** @jsx jsx */
import {DocumentChange} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {MintterEditor} from '@app/editor/mintter-changes/plugin'
import {getEditorBlock} from '@app/editor/utils'
import {Editor} from 'slate'
import {afterEach, describe, expect, test} from 'vitest'

describe.skip('Change Transforms', () => {
  let editor = (
    <editor>
      <group>
        <statement id="block1">
          <paragraph>
            <text>Paragraph 1</text>
          </paragraph>
        </statement>
        <statement id="block2">
          <paragraph>
            <text>Paragraph 2 (parent)</text>
          </paragraph>
          <group>
            <statement id="block2-1">
              <paragraph>
                <text>Paragraph Child 1</text>
              </paragraph>
            </statement>
            <statement id="block2-2">
              <paragraph>
                <text>Paragraph Child 2</text>
              </paragraph>
            </statement>
          </group>
        </statement>
      </group>
    </editor>
  ) as any as Editor

  afterEach(() => {
    MintterEditor.resetChanges(editor)
  })

  test('deleteBlock', () => {
    MintterEditor.addChange(editor, ['deleteBlock', 'block2-2'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'deleteBlock',
          deleteBlock: 'block2-2',
        },
      },
    ]
    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  })

  test('moveBlock', () => {
    MintterEditor.addChange(editor, ['moveBlock', 'block2'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'moveBlock',
          moveBlock: {
            blockId: 'block2',
            parent: '',
            leftSibling: 'block1',
          },
        },
      },
    ]

    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  })

  test('replaceBlock', () => {
    MintterEditor.addChange(editor, ['replaceBlock', 'block1'])
    let blockEntry = getEditorBlock(editor, {id: 'block1'})
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'replaceBlock',
          replaceBlock: blockToApi(blockEntry![0]),
        },
      },
    ]

    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  })

  test('setTitle', () => {
    MintterEditor.addChange(editor, ['setTitle', 'new title'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'setTitle',
          setTitle: 'new title',
        },
      },
    ]

    expect(MintterEditor.transformChanges(editor)).toEqual(expected)
  }),
    test('all together', () => {
      let blockEntry = getEditorBlock(editor, {id: 'block1'})
      MintterEditor.addChange(editor, ['deleteBlock', 'block2-2'])
      MintterEditor.addChange(editor, ['moveBlock', 'block2'])
      MintterEditor.addChange(editor, ['replaceBlock', 'block1'])
      MintterEditor.addChange(editor, ['setTitle', 'new title'])

      let expected: Array<DocumentChange> = [
        {
          op: {
            $case: 'deleteBlock',
            deleteBlock: 'block2-2',
          },
        },
        {
          op: {
            $case: 'moveBlock',
            moveBlock: {
              blockId: 'block2',
              parent: '',
              leftSibling: 'block1',
            },
          },
        },
        {
          op: {
            $case: 'replaceBlock',
            replaceBlock: blockToApi(blockEntry![0]),
          },
        },
        {
          op: {
            $case: 'setTitle',
            setTitle: 'new title',
          },
        },
      ]

      expect(MintterEditor.transformChanges(editor)).toEqual(expected)
    })
})
