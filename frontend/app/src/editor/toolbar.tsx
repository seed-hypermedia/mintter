import {
  getPreventDefaultHandler,
  getSlatePluginType,
  isMarkActive,
  MARK_BOLD,
  MARK_ITALIC,
  MARK_STRIKETHROUGH,
  MARK_UNDERLINE,
  toggleMark,
  useEventEditorId,
  useStoreEditorState,
} from '@udecode/slate-plugins';
import {
  ToolbarMarkProps as DefaultToolbarMarkProps,
  useBalloonMove,
  useBalloonShow,
} from '@udecode/slate-plugins-toolbar';
import { useMemo, useRef } from 'react';
import * as Portal from '@radix-ui/react-portal';
import { Icon, icons, Button, Box } from '@mintter/ui';
import { Tooltip } from '../components/tooltip'
import { ToolbarLink } from './link-plugin/link-toolbar';

export function Toolbar() {
  const ref = useRef<HTMLDivElement>(null);
  const editor = useStoreEditorState(useEventEditorId('focus'));
  const [hidden] = useBalloonShow({ editor, ref, hiddenDelay: 0 });
  useBalloonMove({ editor, ref, direction: 'top' });

  return (
    <Portal.Root>
      <Box
        ref={ref}
        css={{
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          boxSizing: 'content-box',
          whiteSpace: 'nowrap',
          visibility: hidden ? 'hidden' : 'visible',
          transition: 'top 75ms ease-out, left 75ms ease-out 0s',
          userSelect: 'none',
          background: '$background-muted',
          color: 'white',
          borderRadius: '$2',
          boxShadow: '$3',
          padding: '$1',
          overflow: 'hidden',
        }}
      >
        <ToolbarMark
          type={getSlatePluginType(editor, MARK_BOLD)}
          label="Bold (⌘B)"
          icon="Bold"
        />
        <ToolbarMark
          type={getSlatePluginType(editor, MARK_ITALIC)}
          label="Italic (⌘I)"
          icon="Italic"
        >
          <Icon name="Italic" />
        </ToolbarMark>
        <ToolbarMark
          type={getSlatePluginType(editor, MARK_UNDERLINE)}
          label="Underline (⌘U)"
          icon="Underline"
        />
        <ToolbarMark
          type={getSlatePluginType(editor, MARK_STRIKETHROUGH)}
          label="Strikethrough (⌘+Shift+S)"
          icon="Strikethrough"
        />
        <ToolbarLink />
      </Box>
    </Portal.Root>
  );
}

export type ToolbarMarkProps = Omit<DefaultToolbarMarkProps, 'icon'> & {
  label: string;
  icon: keyof typeof icons;
};

function ToolbarMark({ type, icon, label }: ToolbarMarkProps) {
  const editor = useStoreEditorState(useEventEditorId('focus'));

  const active = useMemo(
    () => !!editor?.selection && isMarkActive(editor, type),
    [editor?.selection, type],
  );

  return (
    <Tooltip content={label}>
      <Button
        css={
          active
            ? {
              backgroundColor: '$background-opposite',
              color: '$text-opposite',
            }
            : {}
        }
        onMouseDown={
          editor
            ? getPreventDefaultHandler(toggleMark, editor, type)
            : undefined
        }
        variant="ghost"
        size="1"
        color="muted"
      >
        <Icon name={icon} />
      </Button>
    </Tooltip>
  );
}
