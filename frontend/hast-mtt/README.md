# hast-util-to-mttast

# hast-util-to-mttast

## Test configuration

```bash
yarn install @types/jest jest ts-jest typescript -D
```

in your package.json:

```js
{
    //...
    "scripts": {
        //...
        "test": "test": "node --experimental-vm-modules --no-warnings ../../node_modules/jest/bin/jest.js -c=jest.config.js"
    }
}
```

your tsconfig should look similar to this:

```js
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "esModuleInterop": true
  }
}
```

jest.config.js

```js
/** @type {import('@jest/types').Config.InitialOptions} */
module.exports = {
  preset: 'ts-jest/presets/default-esm',
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig-esm.json',
      useESM: true,
    },
  },
}
```

you should be good to go!
