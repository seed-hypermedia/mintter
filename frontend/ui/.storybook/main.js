module.exports = {
  stories: ['../src/**/*.stories.mdx', '../src/**/*.stories.@(tsx)'],
  addons: ['@storybook/addon-links', '@storybook/addon-essentials'],
  core: {
    builder: 'storybook-builder-vite',
  },
}
