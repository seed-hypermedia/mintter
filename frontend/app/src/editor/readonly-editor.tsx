import * as React from 'react';
import { SlateReactPresentation } from 'slate-react-presentation';

import { ELEMENT_PARAGRAPH } from './elements/defaults';

// TODO: fix types
export function ReadOnlyEditor({ value }: any) {
  /**
   * element to render
   * - paragraph
   *
   * leafs to render
   * - bold
   * - italic
   * - code
   * - underline
   * - strikethrough
   */

  const renderElement = React.useCallback(({ element, children }) => {
    switch (element.type) {
      case ELEMENT_PARAGRAPH:
        return <p>{children}</p>;
      default:
        return (
          <div>
            <div contentEditable={false} style={{ userSelect: 'none' }}>
              <p>
                Element not supported by <code>ReadOnlyEditor</code>
              </p>
              <pre>
                <code>{JSON.stringify(element, null, 4)}</code>
              </pre>
            </div>
            {children}
          </div>
        );
    }
  }, []);

  const renderLeaf = React.useCallback(({ children, leaf }) => {
    let Component: any = 'span';
    let className = '';

    if (leaf.bold) {
      Component = 'strong';
    }

    if (leaf.italic) {
      Component = 'em';
    }

    if (leaf.code) {
      Component = 'code';
    }

    if (leaf.underline) {
      // noop
    }

    if (leaf.strikethrough) {
      Component = 's';
      className = 'line-through';
    }

    return <Component className={className}>{children}</Component>;
  }, []);

  return (
    <SlateReactPresentation
      value={value}
      renderElement={renderElement}
      renderLeaf={renderLeaf}
    />
  );
}
