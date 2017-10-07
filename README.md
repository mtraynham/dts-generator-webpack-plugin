# dts-generator-webpack-plugin
A plugin that executes [dts-generator](https://github.com/SitePen/dts-generator) and appends the results to 
the webpack compilation as an additional asset.

## Usage
```typescript
import DtsGeneratorPlugin, {IDtsGeneratorPluginOptions} from 'dts-generator-webpack-plugin';
import resolve from 'path';
import {Configuration} from 'webpack';

const dtsGeneratorPluginOptions: IDtsGeneratorPluginOptions = {
    name: 'myPackage'
};
const webpackConfig: Configuration = {
    entry: 'index.ts',
    output: {
        path: resolve(__dirname, 'dist'),
    },
    plugins: [
        new DtsGeneratorPlugin(dtsGeneratorPluginOptions)
    ]
};
export default webpackConfig;
```

## Options
All [options provided by dts-generator](https://github.com/SitePen/dts-generator#options) are supported.  The
option `out` is no longer required and will be ignored if set as this plugin instead appends it as an
additional asset to the webpack build.  The Webpack configuration's `output` will instead decide
where the generated d.ts file is placed.
