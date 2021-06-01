import { Box } from '@mintter/ui/box';
import * as Portal from '@radix-ui/react-portal';
import { createContext, useContext, useEffect, useState } from 'react';
import { ReactEditor } from 'slate-react';
import { Button } from '@mintter/ui/button';
import { useStoreEditorState } from '@udecode/slate-plugins-core';

export const MintterLinkMenuContext = createContext({
  open: false,
  show: () => { },
  hide: () => { },
});

export function MintterLinkMenu() {
  const { open, hide } = useContext(MintterLinkMenuContext);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  const editor = useStoreEditorState();
  console.log(
    '🚀 ~ file: mintter-link-menu.tsx ~ line 17 ~ MintterLinkMenu ~ editor',
    editor,
  );

  useEffect(() => {
    if (open && editor) {
      const range =
        editor.selection && ReactEditor.toDOMRange(editor, editor.selection);
      const rect = range?.getBoundingClientRect();

      if (rect) {
        setCoords({
          x: rect.right + window.pageXOffset,
          y: rect.bottom + window.pageYOffset,
        });
      }
    }
  }, [open, editor?.children]);
  return (
    <Portal.Root>
      <Box
        css={{
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'content-box',
          alignItems: 'start',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          background: '$background-muted',
          borderRadius: '$2',
          boxShadow: '$3',
          padding: '$1',
          visibility: open ? 'visible' : 'hidden',
          position: 'absolute',
          top: `${coords.y}px`,
          left: `${coords.x}px`,
        }}
      >
        <Button onClick={hide} variant="ghost" color="muted">
          Dismiss
        </Button>
        <Button
          onClick={() => {
            console.log('create bookmark');
            hide();
          }}
          variant="ghost"
          color="muted"
        >
          Create Document Bookmark
        </Button>
      </Box>
    </Portal.Root>
  );
}
