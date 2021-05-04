import * as React from 'react';
import { Portal } from 'reakit/Portal';
import { Menu, MenuItem as ReakitMenuItem, MenuProps } from 'reakit/Menu';
import { useSlate } from 'slate-react';

/**
 *
 * - the position is given by the current selection
 * - the editor selection needs to be transformed to DOM so we can position the menu correctly (check useBalloonMove)
 * - show/hide will be triggered by the insertData function
 */

function setMenuPosition(el: HTMLDivElement) {
  const domSelection = window.getSelection();

  if (!domSelection || domSelection.rangeCount > 1) return;

  const domRange = domSelection.getRangeAt(0);
  const rect = domRange.getBoundingClientRect();

  el.style.top = `${rect.bottom + window.pageYOffset}px`;
  el.style.left = `${rect.left + window.pageXOffset}px`;
}

const MenuItem = React.forwardRef(
  ({ className = '', children, ...props }: any, ref: any) => {
    return (
      <ReakitMenuItem
        ref={ref}
        {...props}
        className={`w-full py-1 px-2 focus:bg-blue-100 text-xs text-left disabled:opacity-50 flex items-center ${className}`}
      >
        {children}
      </ReakitMenuItem>
    );
  },
);

export function LinkMenu({ menu }: { menu: MenuProps }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const initialFocus = React.useRef<HTMLButtonElement>(null);
  const editor = useSlate();
  React.useEffect(() => {
    if (ref.current && menu.visible) {
      console.log('linkmenu is visible');
      setMenuPosition(ref.current);
    }
  }, [editor, menu, ref]);

  React.useEffect(() => {
    if (menu.visible && initialFocus) {
      console.log('linkmenu is focus');
      initialFocus.current?.focus();
    }
  }, [menu.visible]);
  return (
    <Portal>
      <Menu
        {...menu}
        tabIndex={0}
        hideOnClickOutside
        aria-label="Link Menu"
        ref={ref}
        className="absolute top-0 left-0 bg-white shadow-md"
      >
        <MenuItem
          {...menu}
          onClick={() => {
            console.log('dismiss menu');
            menu.hide?.();
          }}
        >
          Dismiss
        </MenuItem>
        <MenuItem
          {...menu}
          ref={initialFocus}
          onClick={() => {
            console.log('create transclusion');
          }}
        >
          Create a transclusion
        </MenuItem>
      </Menu>
    </Portal>
  );
}
