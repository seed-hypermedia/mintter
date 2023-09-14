import {
  BlockNoteEditor,
  BlockNoteEditorOptions,
  BlockSchema,
  DefaultBlockSchema,
} from "@/blocknote/core";
import {HMBlockSchema} from "@/schema";
import {DependencyList, FC, useEffect, useState} from "react";
import {blockNoteToMantineTheme} from "../BlockNoteTheme";
import {createReactBlockSideMenuFactory} from "../BlockSideMenu/BlockSideMenuFactory";
import {DragHandleMenuProps} from "../BlockSideMenu/components/DragHandleMenu";
import {createReactFormattingToolbarFactory} from "../FormattingToolbar/FormattingToolbarFactory";
import {createReactHyperlinkToolbarFactory} from "../HyperlinkToolbar/HyperlinkToolbarFactory";
import {defaultReactSlashMenuItems} from "../SlashMenu/defaultReactSlashMenuItems";
import {createReactSlashMenuFactory} from "../SlashMenu/SlashMenuFactory";
import {darkDefaultTheme, lightDefaultTheme} from "../defaultThemes";

//based on https://github.com/ueberdosis/tiptap/blob/main/packages/react/src/useEditor.ts

type CustomElements<BSchema extends BlockSchema> = Partial<{
  formattingToolbar: FC<{editor: BlockNoteEditor<BSchema>}>;
  dragHandleMenu: FC<DragHandleMenuProps<BSchema>>;
}>;

function useForceUpdate() {
  const [, setValue] = useState(0);

  return () => setValue((value) => value + 1);
}

/**
 * Main hook for importing a BlockNote editor into a React project
 */
export const useBlockNote = <BSchema extends HMBlockSchema>(
  options: Partial<
    BlockNoteEditorOptions<BSchema> & {
      customElements: CustomElements<BSchema>;
    }
  > = {},
  deps: DependencyList = []
) => {
  const [editor, setEditor] = useState<BlockNoteEditor<BSchema> | null>(null);
  const forceUpdate = useForceUpdate();
  const preferDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  useEffect(() => {
    let isMounted = true;
    // TODO: Fix typing. UiFactories expects only BaseSlashMenuItems, not extended types. Can be fixed with a generic,
    //  but it would have to be on several different classes (BlockNoteEditor, BlockNoteEditorOptions, UiFactories) and
    //  gets messy quick.
    let newOptions: Record<any, any> = {
      slashCommands: defaultReactSlashMenuItems,
      ...options,
    };

    if (newOptions.customElements && newOptions.uiFactories) {
      console.warn(
        "BlockNote editor initialized with both `customElements` and `uiFactories` options, prioritizing `uiFactories`."
      );
    }

    let uiFactories = {
      formattingToolbarFactory: createReactFormattingToolbarFactory(
        blockNoteToMantineTheme(
          preferDark ? darkDefaultTheme : lightDefaultTheme
        ),
        newOptions.customElements?.formattingToolbar
      ),
      hyperlinkToolbarFactory: createReactHyperlinkToolbarFactory(
        blockNoteToMantineTheme(
          preferDark ? darkDefaultTheme : lightDefaultTheme
        )
      ),
      slashMenuFactory: createReactSlashMenuFactory(
        blockNoteToMantineTheme(
          preferDark ? darkDefaultTheme : lightDefaultTheme
        )
      ),
      blockSideMenuFactory: createReactBlockSideMenuFactory(
        blockNoteToMantineTheme(
          preferDark ? darkDefaultTheme : lightDefaultTheme
        ),
        newOptions.customElements?.dragHandleMenu
      ),
      ...newOptions.uiFactories,
    };

    newOptions = {
      ...newOptions,
      uiFactories,
    };

    const instance = new BlockNoteEditor<BSchema>(
      newOptions as Partial<BlockNoteEditorOptions<BSchema>>
    );

    setEditor(instance);

    instance._tiptapEditor.on("transaction", () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (isMounted) {
            forceUpdate();
          }
        });
      });
    });

    return () => {
      instance._tiptapEditor.destroy();
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return editor;
};
