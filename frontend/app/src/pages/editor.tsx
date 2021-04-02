import * as React from 'react';
import type { ReactEditor } from 'slate-react';
import { useHistory, useParams } from 'react-router';
import { useMutation } from 'react-query';
import { setDefaults } from '@udecode/slate-plugins';
import { useMenuState } from 'reakit/Menu';
import { useSidePanel } from '../sidepanel';
import { useDraft } from '@mintter/hooks';
import { publishDraft } from '@mintter/client';
import { Text } from '@mintter/ui/text';
import { Box } from '@mintter/ui/box';
import { Button } from '@mintter/ui/button';
import { createPlugins } from '@mintter/editor/plugins';
import { options } from '@mintter/editor/options';
import { useEditor } from '@mintter/editor/use-editor';
import { useEditorValue } from '@mintter/editor/use-editor-value';
import { EditorComponent } from '@mintter/editor/editor-component';
import { Textarea } from '@components/textarea';
import { FormControl } from '@components/form-control';
import { Separator } from '@components/separator';
import { Container } from '@components/container';

const Editor: React.FC = () => {
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
        <Button color="primary" appearance="pill" size="2">
          PUBLISH
        </Button>
        <Button
          color="transparent"
          appearance="square"
          size="1"
          onClick={() => sidepanelSend?.({ type: 'SIDEPANEL_TOOGLE' })}
        ></Button>
      </Box>
      <Container css={{ gridArea: 'maincontent', marginBottom: 300 }}>
        <Textarea
          value={title}
          onChange={setTitle}
          data-testid="editor_title"
          name="title"
          placeholder="document title"
          css={{
            $$borderColor: 'transparent',
            $$borderColorHover: 'transparent',
            $$backgroundColor: '$colors$background-alt',
            fontSize: '$7',
            fontWeight: '$bold',
            letterSpacing: '0.01em',
            lineHeight: '$1',
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
            $$backgroundColor: '$colors$background-alt',
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
            <code>{JSON.stringify(editorState, null, 4)}</code>
          </pre>
        </Box>
      ) : null}
    </Box>
  );
};

export default Editor;
