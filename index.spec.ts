import Bluebird, {promisify} from 'bluebird';
import {resolve} from 'path';
import {DirOptions, tmpName} from 'tmp';
import * as webpack from 'webpack';
import DtsGeneratorPlugin, {IDtsGeneratorPluginOptions} from './index';

interface IStatsJsonAsset {
    name: string;
    size: number;
    chunks: number[]; // is this safe to change Array<string|number> type?
    chunkNames: string[];
    emitted: boolean;
    isOverSizeLimit: boolean;
}

interface IStatsJson {
    assets: IStatsJsonAsset[];
    chunks: string[]; // is this safe to create an interface to accommodate object from webpack?
    warnings: string[];
    errors: string[];
}

interface IWebpackResult {
    stats: webpack.Stats;
    statsJson: IStatsJson;
}

/**
 *  This helps adapt Webpack 4.* without breaking things
 */
function resolveStatsJson(fromWebpack: webpack.Stats.ToJsonOutput): IStatsJson {
    const assets: IStatsJsonAsset[] = [];
    if (Array.isArray(fromWebpack.assets)) {
        for (const eachRawAsset of fromWebpack.assets) {
            assets.push({
                ...eachRawAsset,
                isOverSizeLimit : (eachRawAsset.isOverSizeLimit === true),
                chunks : resolveToNumericChunks(eachRawAsset.chunks)
            });
        }
    }
    console.warn(assets);

    const chunks: string[] = [];
    if (Array.isArray(fromWebpack.chunks)) {
        for (const eachChunkObj of fromWebpack.chunks) {
            chunks.push(...eachChunkObj.names);
        }
    }
    console.warn(chunks);

    return {
        ...fromWebpack,
        assets : assets,
        chunks : chunks
    };
}

/**
 *  Resolve assets.chunks into supported type (number[])
 */
function resolveToNumericChunks(input: (string|number)[]): number[] {
    const output: number[] = [];

    for (const eachInput of input) {
        const eachOutput: number = Number(eachInput);
        if (!isNaN(eachOutput)) {
            output.push(eachOutput);
        } else {
            console.warn(`DTS Generator Plugin: Chunk "${eachInput}" is invalid`);
        }
    }

    return output;
}

describe ('dtsGeneratorPlugin', (): void => {

    // TODO: Change every "any" type into correct type

    const defaultName: string = 'foo';
    let webpackConfig: (dtsGeneratorPluginOptions?: IDtsGeneratorPluginOptions) => Bluebird<IWebpackResult>;
    beforeAll((): any => {
        const tmpNameAsync: (options: DirOptions) => Bluebird<string> =
            promisify<string, DirOptions>(tmpName);
        const webpackAsync: (configuration: webpack.Configuration) => Bluebird<webpack.Stats> =
            promisify<webpack.Stats, webpack.Configuration>(webpack);
        const defaultDtsGeneratorPluginOptions: IDtsGeneratorPluginOptions = {
            name: defaultName,
            project: resolve(__dirname, 'fixtures')
        };
        webpackConfig = (dtsGeneratorPluginOptions: IDtsGeneratorPluginOptions = defaultDtsGeneratorPluginOptions):
                Bluebird<IWebpackResult> =>
            tmpNameAsync({dir: '/tmp'})
                .then((): any => webpackAsync({
                    entry: resolve(__dirname, 'fixtures/index.ts'),
                    resolve: {extensions: ['.ts']},
                    plugins: [new DtsGeneratorPlugin({...defaultDtsGeneratorPluginOptions, ...dtsGeneratorPluginOptions})],
                    module: {rules: [{test: /\.ts$/, loader: 'awesome-typescript-loader', query: {silent: true}}]},
                    output: {filename: '[name].bundle.js', path: resolve(__dirname, '.tmp')}
                }))
                .then((stats: webpack.Stats): any => ({stats, statsJson: resolveStatsJson(stats.toJson())}));
    });

    it ('should emit with standard options', (): any =>
        webpackConfig()
            .then(({stats, statsJson}: IWebpackResult): any => {
                //console.warn(statsJson);
                expect(stats.hasWarnings())
                    .toBe(false);
                expect(stats.hasErrors())
                    .toBe(false);
                expect(statsJson.assets.map((value: IStatsJsonAsset): any => value.name))
                    .toContain(`${defaultName}.d.ts`);
            }));
    it ('should emit with different simple options', (): any =>
        webpackConfig({
            name: 'foobar',
            indent: '    ',
            main: 'foobar/index'
        })
        .then(({stats, statsJson}: IWebpackResult): any => {
            expect(stats.hasWarnings())
                .toBe(false);
            expect(stats.hasErrors())
                .toBe(false);
            expect(statsJson.assets.map((value: IStatsJsonAsset): any => value.name))
                .toContain('foobar.d.ts');
        }));
});
