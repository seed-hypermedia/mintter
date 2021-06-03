import { Box } from '@mintter/ui/box';
import * as Portal from '@radix-ui/react-portal';
import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ReactEditor } from 'slate-react';
import { Button } from '@mintter/ui/button';
import { useStoreEditorState } from '@udecode/slate-plugins-core';
import { Menu, MenuItem as ReakitMenuItem, MenuProps } from 'reakit/Menu';
import { createQuoteFromLink } from '../quote-plugin/create-quote-from-link';

function setMenuPosition(el: HTMLDivElement) {
  const domSelection = window.getSelection();

  if (!domSelection || domSelection.rangeCount > 1) return;

  const domRange = domSelection.getRangeAt(0);
  const rect = domRange.getBoundingClientRect();

  el.style.top = `${rect.bottom + window.pageYOffset}px`;
  el.style.left = `${rect.left + window.pageXOffset}px`;
}

export type MintterLinkMenuProps = {
  menu: MenuStateReturn;
};

const MenuItem = forwardRef(
  ({ className = '', children, ...props }: any, ref: any) => {
    return (
      <Box
        as={ReakitMenuItem}
        ref={ref}
        css={{
          fontSize: 13,
          padding: '5px 10px',
          textAlign: 'left',
          borderRadius: 3,
          cursor: 'default',
          '&:focus': {
            outline: 'none',
            boxShadow: '$focus',
          },
        }}
        {...props}
      >
        {children}
      </Box>
    );
  },
);

export function MintterLinkMenu({ menu }: MintterLinkMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const initialFocus = useRef<HTMLButtonElement>(null);
  const editor = useStoreEditorState();

  useEffect(() => {
    if (ref.current && menu.visible) {
      setMenuPosition(ref.current);
    }
  }, [editor, menu, ref]);

  useEffect(() => {
    if (menu.visible && initialFocus) {
      initialFocus.current?.focus();
    }
  }, [menu.visible]);

  return (
    <Portal.Root>
      <Box
        as={Menu}
        {...menu}
        tabIndex={0}
        hideOnClickOutside
        aria-label="Link Menu"
        ref={ref}
        css={{
          // position: 'absolute',
          boxShadow: '$3',
          backgroundColor: 'white',
          display: 'flex',
          flexDirection: 'column',
          '&:focus': {
            outline: 'none',
            boxShadow: '$focus',
          },
        }}
      >
        <MenuItem
          {...menu}
          ref={initialFocus}
          onClick={() => {
            createQuoteFromLink(editor);
            menu.hide?.();
          }}
        >
          Quote block
        </MenuItem>
        <MenuItem
          {...menu}
          onClick={() => {
            console.log('dismiss menu');
            menu.hide?.();
          }}
        >
          Dismiss
        </MenuItem>
      </Box>
    </Portal.Root>
  );
}
