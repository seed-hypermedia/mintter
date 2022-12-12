import { Meta, StoryObj } from '@storybook/react';
import { SiteHead } from '../site-head';

// More on how to set up stories at: https://storybook.js.org/docs/7.0/react/writing-stories/introduction
const meta: Meta<typeof SiteHead> = {
  title: 'Example/SiteHead',
  component: SiteHead,
  tags: ['docsPage'],
  argTypes: {
    backgroundColor: {
      control: 'color',
    },
  },
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof SiteHead>;

export const Primary: Story = {};
