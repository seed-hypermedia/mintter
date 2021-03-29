import * as React from 'react';
import type { ReactEditor } from 'slate-react';
import { useHistory, useParams } from 'react-router';
import { setDefaults } from '@udecode/slate-plugins';
import { useMenuState } from 'reakit/Menu';
import { Container } from '@components/container';
import { Grid } from '@mintter/ui-legacy/grid';
import { useTheme } from './theme-context';
import { useSidePanel } from './sidepanel';
import { useDraft } from './mintter-hooks';
import { createPlugins } from '@mintter/editor/plugins';
import { options } from '@mintter/editor/options';
import { useEditor } from '@mintter/editor/use-editor';
import { useMutation } from 'react-query';
import { publishDraft } from './mintter-client';
import { Box } from '@mintter/ui-legacy/box';
import { Button } from '@mintter/ui-legacy/button';
import { Textarea } from '@components/textarea';
import { useEditorValue } from '@mintter/editor/use-editor-value';
import { EditorComponent } from '@mintter/editor/editor-component';
import { FormControl } from '@components/form-control';
import { Separator } from '@components/separator';

const Editor: React.FC = () => {
  const { theme } = useTheme();
  const history = useHistory();
  const query = new URLSearchParams(window.location.search);
  const { documentId } = useParams<{ documentId: string }>();
  const { isLoading, isError, error, data } = useDraft(documentId);
  const titleRef = React.useRef<HTMLInputElement>(null);
  const linkMenu = useMenuState({ loop: true, wrap: true });
  const subtitleRef = React.useRef<HTMLInputElement>(null);

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

  if (isError) {
    console.error('useDraft error: ', error);
    return <p>Editor ERROR</p>;
  }

  if (isLoading) {
    return <p>loading draft...</p>;
  }

  return (
    <Grid
      css={{
        gridTemplateAreas: isSidepanelOpen
          ? `"controls controls"
        "maincontent sidepanel"`
          : `"controls controls"
        "maincontent maincontent"`,
        gridTemplateColumns: '2fr 1fr',
        gridTemplateRows: '50px 1fr',
      }}
    >
      <Box
        css={{
          display: 'flex',
          gridArea: 'controls',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '$2',
        }}
      >
        <Button variant="primary" appearance="pill" size="2">
          Publish
        </Button>
        <Button
          variant="muted"
          appearance="pill"
          size="1"
          onClick={() => sidepanelSend?.({ type: 'SIDEPANEL_TOOGLE' })}
        >
          sidepanel
        </Button>
      </Box>
      <Container css={{ gridArea: 'maincontent' }}>
        <Textarea
          value={title}
          onChange={setTitle}
          data-testid="editor_title"
          name="title"
          placeholder="document title"
          css={{
            $$borderColor: 'transparent',
            $$borderColorHover: 'transparent',
            fontSize: '$6',
            lineHeight: '1.25',
            gontWeight: '$4',
            fontFamily: '$heading',
            marginTop: '$6',
            px: '0',
          }}
        />

        <Textarea
          value={subtitle}
          onChange={setSubtitle}
          data-testid="editor_subtitle"
          name="subtitle"
          placeholder="subtitle"
          css={{
            $$borderColor: 'transparent',
            $$borderColorHover: 'transparent',
            fontSize: '$4',
            lineHeight: '1.25',
            marginTop: '$4',
            px: '0',
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
            backgroundColor: '$gray700',
            overflow: 'auto',
            gridArea: 'sidepanel',
          }}
        >
          <pre>
            <code>{JSON.stringify(editorState, null, 4)}</code>
          </pre>
          <pre>
            <code>{JSON.stringify(editorState, null, 4)}</code>
          </pre>
          <pre>
            <code>{JSON.stringify(editorState, null, 4)}</code>
          </pre>
        </Box>
      ) : null}
    </Grid>
  );
};

export default Editor;
