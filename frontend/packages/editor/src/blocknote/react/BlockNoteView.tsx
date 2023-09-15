import {BlockNoteEditor, BlockSchema, mergeCSSClasses} from '@/blocknote/core'
import {createStyles, MantineProvider} from '@mantine/core'
import {EditorContent} from '@tiptap/react'
import {HTMLAttributes, ReactNode, useMemo} from 'react'
// import { blockNoteToMantineTheme, Theme } from "./BlockNoteTheme";
// import { darkDefaultTheme, lightDefaultTheme } from "./defaultThemes";
// import usePrefersColorScheme from "use-prefers-color-scheme";
// import { BlockNoteTheme } from "./BlockNoteTheme";

// Renders the editor as well as all menus & toolbars using default styles.
function BaseBlockNoteView<BSchema extends BlockSchema>(
  props: {
    editor: BlockNoteEditor<BSchema>
    children?: ReactNode
  } & HTMLAttributes<HTMLDivElement>,
) {
  const {classes} = createStyles({root: {}})(undefined, {
    name: 'Editor',
  })

  const {editor, children, className, ...rest} = props

  return (
    <EditorContent
      editor={props.editor?._tiptapEditor || null}
      className={mergeCSSClasses(classes.root, props.className || '')}
      {...rest}
    >
      {props.children}
    </EditorContent>
  )
}

export function BlockNoteView<BSchema extends BlockSchema>(
  props: {
    editor: BlockNoteEditor<BSchema>
    // theme?:
    //   | "light"
    //   | "dark"
    //   | Theme
    //   | {
    //       light: Theme;
    //       dark: Theme;
    //     };
    children?: ReactNode
  } & HTMLAttributes<HTMLDivElement>,
) {
  // const {
  //   theme = { light: lightDefaultTheme, dark: darkDefaultTheme },
  //   ...rest
  // } = props;

  // const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)')
  // .matches;

  // const mantineTheme = useMemo(() => {
  //   if (theme === "light") {
  //     return blockNoteToMantineTheme(lightDefaultTheme);
  //   }

  //   if (theme === "dark") {
  //     return blockNoteToMantineTheme(darkDefaultTheme);
  //   }

  //   if ("light" in theme && "dark" in theme) {
  //     return blockNoteToMantineTheme(
  //       theme[preferredTheme ? "dark" : "light"]
  //     );
  //   }

  //   return blockNoteToMantineTheme(theme);
  // }, [preferredTheme, theme]);

  return (
    // TODO: Removed mantine because it conflicts with our styling
    // <MantineProvider theme={mantineTheme}>
    <BaseBlockNoteView {...props} />
    // </MantineProvider>
  )
}
