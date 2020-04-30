import React from 'react'
import {
  createEditor,
  Editor,
  // Transforms, Node, Element, Path
} from 'slate'
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
import {withSections} from './SectionPlugin'

const resetOptions = {
  types: [
    BLOCKQUOTE,
    HeadingType.H1,
    HeadingType.H2,
    HeadingType.H3,
    'section',
  ],
}

export function useEditor(plugins: any[]): Editor {
  return React.useMemo(
    () =>
      withSections()(
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
      ),

    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
}
