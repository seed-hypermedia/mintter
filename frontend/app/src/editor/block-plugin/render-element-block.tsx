import * as React from 'react';
import { getRenderElement, setDefaults } from '@udecode/slate-plugins';
import { DEFAULTS_BLOCK } from './defaults';
import { Block } from './components/block';
export const renderElementBlock = (options?: any) => {
  const { block } = setDefaults(options, DEFAULTS_BLOCK);
  const { customProps = {} } = block;

  return getRenderElement({
    ...block,
    // TODO: fix types
    component: (props: any) => <Block {...props} {...customProps} />,
  });
};
