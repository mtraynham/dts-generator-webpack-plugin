import Bluebird, {promisify} from 'bluebird';
import {resolve} from 'path';
import {Options, tmpName} from 'tmp';
import * as webpack from 'webpack';
import DtsGeneratorPlugin, {IDtsGeneratorPluginOptions} from './index';

interface IStatsJsonAsset {
    name: string;
    size: number;
    chunks: number[];
    chunkNames: string[];
    emitted: boolean;
    isOverSizeLimit: boolean;
}

interface IStatsJson {
    assets: IStatsJsonAsset[];
    chunks: string[];
    warnings: string[];
    errors: string[];
}

interface IWebpackResult {
    stats: webpack.Stats;
    statsJson: IStatsJson;
}

describe ('dtsGeneratorPlugin', () => {

    const defaultName: string = 'foo';
    let webpackConfig: (dtsGeneratorPluginOptions?: IDtsGeneratorPluginOptions) => Bluebird<IWebpackResult>;
    beforeAll(() => {
        const tmpNameAsync: (options: Options) => Bluebird<string> =
            promisify<string, Options>(tmpName);
        const webpackAsync: (configuration: webpack.Configuration) => Bluebird<webpack.Stats> =
            promisify<webpack.Stats, webpack.Configuration>(webpack);
        const defaultDtsGeneratorPluginOptions: IDtsGeneratorPluginOptions = {
            name: defaultName,
            project: resolve(__dirname, 'fixtures')
        };
        webpackConfig = (dtsGeneratorPluginOptions: IDtsGeneratorPluginOptions = defaultDtsGeneratorPluginOptions):
                Bluebird<IWebpackResult> =>
            tmpNameAsync({dir: resolve(__dirname, '.tmp')})
                .then((outputPath: string) => webpackAsync({
                    entry: resolve(__dirname, 'fixtures/index.ts'),
                    resolve: {extensions: ['.ts']},
                    plugins: [new DtsGeneratorPlugin(Object.assign({}, defaultDtsGeneratorPluginOptions, dtsGeneratorPluginOptions))],
                    module: {rules: [{test: /\.ts$/, loader: 'awesome-typescript-loader', query: {silent: true}}]},
                    output: {filename: '[name].bundle.js', path: outputPath}
                }))
                .then((stats: webpack.Stats) => ({stats, statsJson: <IStatsJson> stats.toJson()}));
    });

    it ('should emit with standard options', () =>
        webpackConfig().then(({stats, statsJson}: IWebpackResult) => {
            expect(stats.hasWarnings()).toBe(false);
            expect(stats.hasErrors()).toBe(false);
            expect(statsJson.assets.map((value: IStatsJsonAsset) => value.name))
                .toContain(`${defaultName}.d.ts`);
        }));
    it ('should emit with different simple options', () =>
        webpackConfig({
            name: 'foobar',
            indent: '    ',
            main: 'foobar/index'
        }).then(({stats, statsJson}: IWebpackResult) => {
            expect(stats.hasWarnings()).toBe(false);
            expect(stats.hasErrors()).toBe(false);
            expect(statsJson.assets.map((value: IStatsJsonAsset) => value.name))
                .toContain('foobar.d.ts');
        }));
});
