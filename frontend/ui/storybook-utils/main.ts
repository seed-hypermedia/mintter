import type {StorybookConfig} from "@storybook/core/types"
import {TsconfigPathsPlugin} from "tsconfig-paths-webpack-plugin"

const config: StorybookConfig = {
  stories: [
    "./stories/**/*.stories.@(mdx|js|jsx|ts|tsx)",
    "../src/**/*.stories.@(mdx|js|jsx|ts|tsx)",
  ],
  addons: ["@storybook/addon-essentials", "./addon-theme/register.tsx"],
  webpackFinal: (config) => {
    if (!config.resolve) return config
    config.resolve.plugins = [new TsconfigPathsPlugin({ extensions: config.resolve.extensions })]
    return config
  },
}

export default config
