import Bluebird, {promisify} from 'bluebird';
import dtsGenerator, {DtsGeneratorOptions} from 'dts-generator';
import {readFile} from 'fs';
import {CallbackFunction} from 'tapable';
import {tmpName} from 'tmp';
import {Compiler, Plugin} from 'webpack';

// Promisify our IO utilities
const readFileAsync: (fileName: string) => Bluebird<Buffer> =
    promisify<Buffer, string>(readFile);
const tmpNameAsync: () => Bluebird<string> =
    promisify<string>(tmpName);

// `out` is not used by this plugin, so we can use a Partial type
// to make them optional.  We then specify the properties that
// are still still required.
type Partial<T> = {[P in keyof T]?: T[P]};
interface IDtsGeneratorPluginOptions extends Partial<DtsGeneratorOptions> {
    name: string;
}

// The Webpack typing doesn't have any information on plugin Compilation objects.
// All we need to know about is the assets output.
interface ICompilation {
    assets: {[key: string]: {source(): Buffer, size(): number}};
}

class DtsGeneratorPlugin implements Plugin {
    private options: IDtsGeneratorPluginOptions;

    constructor (options: IDtsGeneratorPluginOptions) {
        this.options = options;
    }

    public apply (compiler: Compiler): void {
        compiler.plugin('emit', (compilation: ICompilation, callback: CallbackFunction) => {
            this.compile()
                .then((source: Buffer) =>
                    Object.assign(compilation.assets, {
                        [`${this.options.name}.d.ts`]: {
                            source: (): Buffer => Buffer.from(source),
                            // Buffer.byteLength does support Buffer type even though the
                            // type definition does not
                            // https://nodejs.org/api/buffer.html#buffer_class_method_buffer_bytelength_string_encoding
                            size: (): number => Buffer.byteLength(<string> <{}> source)
                        }
                    }))
                // Callback with no Error on success
                .then(() => { callback(); })
                .catch(callback);
        });
    }

    /**
     * Run dts-generator, writing the file to a tmp directory and then
     * providing the Buffer back to Webpack
     * @returns {Bluebird<Buffer>}
     */
    private compile (): Bluebird<Buffer> {
        return tmpNameAsync()
            .then((fileName: string) =>
                dtsGenerator(Object.assign({}, this.options, {out: fileName}))
                    .then(() => readFileAsync(fileName)));
    }
}

export default DtsGeneratorPlugin;
export {IDtsGeneratorPluginOptions};
