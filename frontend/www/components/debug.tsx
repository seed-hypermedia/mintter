import React from 'react'
import {SlateBlock} from '@mintter/editor'
import {useState} from 'react'

function simplifyBlocks(blocks) {
  return blocks.map(block => {
    const simpleBlock: Partial<SlateBlock> = {}

    if (block.type) {
      simpleBlock.type = block.type
      simpleBlock.children = simplifyBlocks(block.children)
      return simpleBlock
    }

    return block
  })
}

export function DebugValue({value, className = ''}: any) {
  const [visible, setVisible] = useState(false)
  const val = React.useMemo(
    () => ({
      ...value,

      blocks: simplifyBlocks(value.blocks),
    }),
    [value],
  )
  return (
    process.env.NODE_ENV === 'development' && (
      <div
        className={`fixed right-0 top-0 flex items-end flex-col p-2 overflow-auto mb-8 z-10 max-w-xl ${
          visible ? 'h-screen' : ''
        } ${className}`}
      >
        <button
          className="px-2 py-1 bg-warning rounded text-sm mr-4"
          onClick={() => setVisible(!visible)}
        >{`${visible ? 'hide' : 'show'} value`}</button>
        {visible && (
          <div className="bg-teal-200 p-4 shadow-sm rounded-lg">
            <pre className="text-xs mt-4 whitespace-pre-wrap text-body">
              <code>{JSON.stringify(val, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    )
  )
}
