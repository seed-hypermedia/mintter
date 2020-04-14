import React from 'react'
import {createEditor, Editor} from 'slate'
import {withReact} from 'slate-react'
import {
  withBreakEmptyReset,
  withDeleteStartReset,
  withShortcuts,
  withList,
  withLink,
  withBlock,
  ACTION_ITEM,
  CODE,
  BLOCKQUOTE,
  HeadingType,
  ListType,
  withPasteHtml,
  withPasteMd,
} from 'slate-plugins-next'
import {withMarkdownParser} from '@horacioh/slate-plugin-with-markdown-parser'

const resetOptions = {
  types: [
    ACTION_ITEM,
    BLOCKQUOTE,
    CODE,
    HeadingType.H1,
    HeadingType.H2,
    HeadingType.H3,
    ListType.UL_LIST,
    ListType.OL_LIST,
    ListType.LIST_ITEM,
  ],
}

export default function useEditor(plugins): Editor {
  return React.useMemo(
    () =>
      withShortcuts(
        withList(
          withBreakEmptyReset(resetOptions)(
            withDeleteStartReset(resetOptions)(
              withPasteHtml(plugins)(
                withPasteMd(plugins)(
                  withBlock(
                    withMarkdownParser(withLink(withReact(createEditor()))),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

    [],
  )
}
