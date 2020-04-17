import React from 'react'
import {createEditor, Editor} from 'slate'
import {withReact} from 'slate-react'
import {
  withBreakEmptyReset,
  withDeleteStartReset,
  withShortcuts,
  withList,
  withPasteHtml,
  withPasteMd,
  withVideo,
  withImage,
  withLink,
  withBlock,
  BLOCKQUOTE,
  HeadingType,
} from 'slate-plugins-next'

const resetOptions = {
  types: [BLOCKQUOTE, HeadingType.H1, HeadingType.H2, HeadingType.H3],
}

export function useEditor(plugins: any[]): Editor {
  return React.useMemo(
    () =>
      withShortcuts(
        withVideo(
          withList(
            withBreakEmptyReset(resetOptions)(
              withDeleteStartReset(resetOptions)(
                withImage(
                  withPasteHtml(plugins)(
                    withPasteMd(plugins)(
                      withBlock(withLink(withReact(createEditor()))),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
}
