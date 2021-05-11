import {
  getPreventDefaultHandler,
  getSelectionText,
  getSlatePluginType,
  isMarkActive,
  isSelectionExpanded,
  MARK_BOLD,
  MARK_ITALIC,
  MARK_UNDERLINE,
  toggleMark,
  useEventEditorId,
  useStoreEditorState,
} from '@udecode/slate-plugins';
import {
  BalloonToolbar,
  ToolbarMark,
  useBalloonMove,
  useBalloonShow,
} from '@udecode/slate-plugins-toolbar';
import { useMemo, useRef } from 'react';
import * as Portal from '@radix-ui/react-portal';
import { css } from '@mintter/ui/stitches.config';
import { Icon, icons } from '@mintter/ui/icon';
import { Button } from '@mintter/ui/button';
import { Tooltip } from '@components/tooltip';

const toolbarStyles = css({
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'content-box',
  zIndex: '$max',
  whiteSpace: 'nowrap',
  visibility: 'visible',
  transition: 'top 75ms ease-out, left 75ms ease-out 0s',
  userSelect: 'none',
  background: '$background-muted',
  color: 'white',
  borderRadius: '$2',
  boxShadow: '$3',
  overflow: 'hidden',
});

const hideToolbar = css({
  visibility: 'hidden',
});

export function Toolbar(props) {
  const ref = useRef<HTMLDivElement>(null);
  const editor = useStoreEditorState(useEventEditorId('focus'));
  const [hidden] = useBalloonShow({ editor, ref, hiddenDelay: 0 });
  useBalloonMove({ editor, ref, direction: 'top' });

  console.log({ ref, editor, hidden });
  return (
    <Portal.Root>
      <div
        ref={ref}
        className={`${toolbarStyles()} ${hidden && hideToolbar()}`}
      >
        <ToolbarMark
          type={getSlatePluginType(editor, MARK_BOLD)}
          label="Bold (⌘B)"
        >
          <Icon name="Bold" />
        </ToolbarMark>
        <ToolbarMark
          type={getSlatePluginType(editor, MARK_ITALIC)}
          label="Italic (⌘I)"
        >
          <Icon name="Italic" />
        </ToolbarMark>
        <ToolbarMark type={getSlatePluginType(editor, MARK_UNDERLINE)}
        label="Underline (⌘U)">
          <Icon name="Underline" />
        </ToolbarMark>
      </div>
    </Portal.Root>
  );
}

function ToolbarMark(props) {
  const editor = useStoreEditorState(useEventEditorId('focus'));

  const active = useMemo(
    () => !!editor?.selection && isMarkActive(editor, props.type),
    [editor?.selection, props.type],
  );

  return (
    <Tooltip content={props.label}>
      <Button
        onMouseDown={
          editor
            ? getPreventDefaultHandler(toggleMark, editor, props.type)
            : undefined
        }
        variant="solid"
        size="1"
        color='muted'
        css={{
          borderRadius: 'unset',
        }}
        {...props}
      />
    </Tooltip>
  );
}
