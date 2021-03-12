import React from 'react';
import documents from '@mintter/api/documents/v1alpha/documents_pb';

// TODO: fix types
export function BlockList({ attributes, children, element }: any) {
  const Component =
    element.listStyle === documents.ListStyle.NUMBER ? 'ol' : 'ul';
  return (
    <Component
      {...attributes}
      className={`${
        element.listStyle === documents.ListStyle.NONE ? 'list-none' : ''
      }`}
    >
      {children}
    </Component>
  );
}
