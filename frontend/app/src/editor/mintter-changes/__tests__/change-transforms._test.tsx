/** @jsx jsx */
import {DocumentChange} from '@app/client'
import {blockToApi} from '@app/client/v2/block-to-api'
import {MintterChangesEditor} from '@app/editor/mintter-changes/plugin'
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
    MintterChangesEditor.resetChanges(editor)
  })

  test('deleteBlock', () => {
    MintterChangesEditor.addChange(editor, ['deleteBlock', 'block2-2'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'deleteBlock',
          deleteBlock: 'block2-2',
        },
      },
    ]
    expect(MintterChangesEditor.transformChanges(editor)).toEqual(expected)
  })

  test('moveBlock', () => {
    MintterChangesEditor.addChange(editor, ['moveBlock', 'block2'])
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

    expect(MintterChangesEditor.transformChanges(editor)).toEqual(expected)
  })

  test('replaceBlock', () => {
    MintterChangesEditor.addChange(editor, ['replaceBlock', 'block1'])
    let blockEntry = getEditorBlock(editor, {id: 'block1'})
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'replaceBlock',
          replaceBlock: blockToApi(blockEntry![0]),
        },
      },
    ]

    expect(MintterChangesEditor.transformChanges(editor)).toEqual(expected)
  })

  test('setTitle', () => {
    MintterChangesEditor.addChange(editor, ['setTitle', 'new title'])
    let expected: Array<DocumentChange> = [
      {
        op: {
          $case: 'setTitle',
          setTitle: 'new title',
        },
      },
    ]

    expect(MintterChangesEditor.transformChanges(editor)).toEqual(expected)
  }),
    test('all together', () => {
      let blockEntry = getEditorBlock(editor, {id: 'block1'})
      MintterChangesEditor.addChange(editor, ['deleteBlock', 'block2-2'])
      MintterChangesEditor.addChange(editor, ['moveBlock', 'block2'])
      MintterChangesEditor.addChange(editor, ['replaceBlock', 'block1'])
      MintterChangesEditor.addChange(editor, ['setTitle', 'new title'])

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

      expect(MintterChangesEditor.transformChanges(editor)).toEqual(expected)
    })
})
