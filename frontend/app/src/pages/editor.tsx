import { getNode, getParent, setDefaults } from '@udecode/slate-plugins';
import type { Editor } from 'slate';
import { useRef } from 'react';
import { useHistory, useParams } from 'react-router';
import { useMutation } from 'react-query';
import { useMenuState } from 'reakit/Menu';
import type { ReactEditor } from 'slate-react';

import { publishDraft } from '@mintter/client';
import { useDraft } from '@mintter/hooks';
import { EditorComponent } from '@mintter/editor/editor-component';
import { options } from '@mintter/editor/options';
import { createPlugins } from '@mintter/editor/plugins';
import { useEditor } from '@mintter/editor/use-editor';
import { useEditorValue } from '@mintter/editor/use-editor-value';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { Text } from '@mintter/ui/text';
import { TextField } from '@mintter/ui/text-field';
import * as documents from '@mintter/api/documents/v1alpha/documents_pb';

import { Container } from '@components/container';
import { Separator } from '@components/separator';

import { useSidePanel } from '../sidepanel';
import { ELEMENT_BLOCK } from '@mintter/editor/block-plugin/defaults';
import {
  BlockNode,
  blockSerialize,
} from '@mintter/editor/transformers/transformers';
import { getNodesByType } from '@mintter/editor/mintter-plugin/get-nodes-by-type';

export default function EditorPage() {
  const history = useHistory();
  const query = new URLSearchParams(window.location.search);
  const { documentId } = useParams<{ documentId: string }>();
  const { isLoading, isError, error, data } = useDraft(documentId);
  const titleRef = useRef<HTMLInputElement>(null);
  const linkMenu = useMenuState({ loop: true, wrap: true });
  const subtitleRef = useRef<HTMLInputElement>(null);

  // modify options
  const customOptions = setDefaults(
    {
      link: {
        menu: linkMenu,
      },
    },
    options,
  );

  // editor
  const plugins = createPlugins(customOptions);
  const editor: ReactEditor = useEditor(plugins, customOptions) as ReactEditor;

  const {
    state: editorState,
    setTitle,
    setSubtitle,
    onEditorChange,
    setValue,
  } = useEditorValue({ document: data });
  const { title, subtitle, editorValue } = editorState;

  // publish
  const { mutateAsync: publish } = useMutation(publishDraft);

  // sidepanel
  const { isSidepanelOpen, sidepanelObjects, sidepanelSend } = useSidePanel();

  function saveDocument() {
    const blocks = createBlocksMap(editor);

    console.log('save now', { editorValue, blocks });
  }

  if (isError) {
    console.error('useDraft error: ', error);
    return <Text>Editor ERROR</Text>;
  }

  if (isLoading) {
    return <Text>loading draft...</Text>;
  }

  return (
    <Box
      css={{
        display: 'grid',
        minHeight: '$full',
        gridTemplateAreas: isSidepanelOpen
          ? `"controls controls controls"
        "maincontent maincontent rightside"`
          : `"controls controls controls"
        "maincontent maincontent maincontent"`,
        gridTemplateColumns: 'minmax(300px, 25%) 1fr minmax(300px, 25%)',
        gridTemplateRows: '64px 1fr',
        gap: '$5',
      }}
    >
      <Box
        css={{
          display: 'flex',
          gridArea: 'controls',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '$2',
          paddingHorizontal: '$5',
        }}
      >
        <Button color="primary" shape="pill" size="2" onClick={saveDocument}>
          PUBLISH
        </Button>
        <Button
          size="1"
          onClick={() => sidepanelSend?.({ type: 'SIDEPANEL_TOOGLE' })}
        >
          toggle sidepanel
        </Button>
      </Box>
      <Container css={{ gridArea: 'maincontent', marginBottom: 300 }}>
        <TextField
          // TODO: Fix types
          // @ts-ignore
          as="textarea"
          data-testid="editor_title"
          name="title"
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          rows={1}
          // TODO: Fix types
          // @ts-ignore
          css={{
            $$backgroundColor: '$colors$background-alt',
            $$borderColor: 'transparent',
            $$hoveredBorderColor: 'transparent',
            fontSize: '$7',
            fontWeight: '$bold',
            letterSpacing: '0.01em',
            lineHeight: '$1',
          }}
        />

        <TextField
          // TODO: Fix types
          // @ts-ignore
          as="textarea"
          data-testid="editor_subtitle"
          name="subtitle"
          placeholder="about this publication..."
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          rows={1}
          // TODO: Fix types
          // @ts-ignore
          css={{
            $$backgroundColor: '$colors$background-alt',
            $$borderColor: 'transparent',
            $$hoveredBorderColor: 'transparent',
            fontSize: '$5',
            lineHeight: '1.25',
          }}
        />
        <Separator />
        <Box css={{ mx: '-$4', width: 'calc(100% + $7)' }}>
          <EditorComponent
            editor={editor}
            plugins={plugins}
            options={customOptions}
            value={editorValue}
            onChange={onEditorChange}
            readOnly={false}
            linkMenu={linkMenu}
          />
        </Box>
      </Container>
      {isSidepanelOpen ? (
        <Box
          css={{
            backgroundColor: '$background-contrast',
            overflow: 'auto',
            gridArea: 'rightside',
            color: '$text-opposite',
            padding: '$4',
          }}
        >
          <pre>
            <code>{JSON.stringify(editorState, null, 2)}</code>
          </pre>
        </Box>
      ) : null}
    </Box>
  );
}

function createBlocksMap(editor: Editor): [string, documents.Block][] {
  const iterableBlocks = getNodesByType(editor, ELEMENT_BLOCK, {
    at: [],
  });

  const blocks: [string, documents.Block][] = [];

  for (const [block, path] of iterableBlocks) {
    const b: BlockNode = {
      id: block.id as string,
      type: ELEMENT_BLOCK,
      style:
        (block.style as documents.Block.Type) || documents.Block.Type.BASIC,
      children: block.children as any,
    };
    if (path.length > 4) {
      blocks.push([b.id, blockSerialize(b)]);
    } else {
      const parent = getNode(editor, path.slice(0, path.length - 2));
      blocks.push([b.id, blockSerialize(b, parent?.id as string)]);
    }
  }

  return blocks;
}
