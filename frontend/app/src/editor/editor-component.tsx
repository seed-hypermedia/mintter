import React from 'react';
import { Slate, ReactEditor } from 'slate-react';
import { css } from 'emotion';
import {
  // BalloonToolbar,
  EditablePlugins,
  RenderElement,
  SlateDocument,
  ToolbarElement,
  ToolbarMark,
} from '@udecode/slate-plugins';
import { Box } from '@mintter/ui/box';
import { BalloonToolbar, setDefaults } from '@udecode/slate-plugins';
import { LinkPlugin, ToolbarLink } from './link-plugin';
import { LinkMenu } from './link-plugin/link-menu';
import type { MenuStateReturn } from 'reakit/ts';
import { Button } from '@mintter/ui/button';
import { BOLD_OPTIONS, MARK_BOLD } from './marks/bold';
import { Icon } from '@mintter/ui/icon';
import { MARK_ITALIC } from './marks/italic';
import { ELEMENT_PARAGRAPH } from './elements/defaults';

interface EditorComponentProps {
  editor: any;
  plugins: any[];
  options: any;
  linkMenu: MenuStateReturn;
  value: any;
  onChange: (value: any) => void;
  readOnly?: boolean;
  renderElement?: RenderElement[];
  theme?: 'theme-light' | 'theme-dark';
  push?: any; // TODO: FIXME Types
}

function Editor({
  editor,
  plugins,
  options,
  value,
  onChange,
  readOnly = false,
  renderElement = [],
  linkMenu,
}: EditorComponentProps): JSX.Element {
  return (
    <Slate
      editor={editor}
      value={value}
      onChange={(v) => {
        onChange(v as SlateDocument);
      }}
    >
      {/* <BalloonToolbar
        direction="top"
        theme={theme.includes('dark') ? 'light' : 'dark'}
        arrow
      >
        <ToolbarMark
          type={MARK_BOLD}
          icon={<Icons.Bold />}
          tooltip={{content: 'Bold (⌘B)', ...tooltip}}
        />
      </BalloonToolbar> */}
      <Box>
        {readOnly ? (
          <EditablePlugins
            style={{}}
            readOnly={true}
            plugins={plugins}
            renderElement={renderElement}
            placeholder={
              readOnly ? 'no content' : 'Start writing your masterpiece...'
            }
            spellCheck
            autoFocus
          />
        ) : (
          <>
            <EditablePlugins
              style={{}}
              readOnly={readOnly}
              plugins={plugins}
              renderElement={renderElement}
              placeholder={
                readOnly ? 'no content' : 'Start writing your masterpiece...'
              }
              spellCheck
              autoFocus
              onSelect={() => {
                /**
                 * Chrome doesn't scroll at bottom of the page. This fixes that.
                 */
                if (!(window as any).chrome) return;
                if (editor.selection == null) return;
                try {
                  /**
                   * Need a try/catch because sometimes you get an error like:
                   *
                   * Error: Cannot resolve a DOM node from Slate node: {"type":"p","children":[{"text":"","by":-1,"at":-1}]}
                   */
                  const domPoint = ReactEditor.toDOMPoint(
                    editor,
                    editor.selection.focus,
                  );
                  const node = domPoint[0];
                  if (node == null) return;
                  const element = node.parentElement;
                  if (element == null) return;
                  element.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                  });
                } catch (e) {
                  /**
                   * Empty catch. Do nothing if there is an error.
                   */
                }
              }}
            />
            <Box
              // TODO: Fix types
              // @ts-ignore
              as={BalloonToolbar}
              css={{ backgroundColor: '$background-opposite' }}
            >
              <Button
                as={ToolbarMark}
                type={MARK_BOLD}
                variant="ghost"
                size="1"
                css={{ '$$outlined-hovered-background-color': 'transparent' }}
                icon={<Icon name="Bold" size="2" color="opposite" />}
              />
              <Button
                as={ToolbarMark}
                type={MARK_ITALIC}
                variant="ghost"
                size="1"
                css={{ '$$outlined-hovered-background-color': 'transparent' }}
                icon={<Icon name="Italic" size="2" color="opposite" />}
              />
              <ToolbarLink {...options} />
              <Button
                as={ToolbarElement}
                type={ELEMENT_PARAGRAPH}
                variant="ghost"
                size="1"
                css={{ '$$outlined-hovered-background-color': 'transparent' }}
                icon={<Icon name="Paragraph" size="2" color="opposite" />}
              />
              <Button
                as={ToolbarElement}
                type="h2"
                variant="ghost"
                size="1"
                css={{ '$$outlined-hovered-background-color': 'transparent' }}
                icon={<Icon name="Heading" size="2" color="opposite" />}
              />
            </Box>
            <LinkMenu menu={linkMenu} />
          </>
        )}
      </Box>
    </Slate>
  );
}

// TODO: fix types
export const EditorComponent = (props: any) => <Editor {...props} />;
