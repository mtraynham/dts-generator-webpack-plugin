import Bluebird, {promisify} from 'bluebird';
import dtsGenerator, {DtsGeneratorOptions} from 'dts-generator';
import {readFile} from 'fs';
import {Tapable} from 'tapable';
import {tmpName} from 'tmp';
import webpack, {Compiler, Plugin} from 'webpack';

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

class DtsGeneratorPlugin implements Plugin {
    private readonly options: IDtsGeneratorPluginOptions;

    constructor (options: IDtsGeneratorPluginOptions) {
        this.options = options;
    }

    public apply (compiler: Compiler): void {
        compiler.hooks.emit.tapAsync(
            'dts-generator-webpack-plugin',
            (compilation: webpack.compilation.Compilation, callback: Tapable.CallbackFunction): void => {
                this.compile()
                    .then((source: Buffer): Bluebird<Buffer> => ({...compilation.assets,
                        [`${this.options.name}.d.ts`]: {
                            source: (): Buffer => Buffer.from(source),
                            // Buffer.byteLength does support Buffer type even though the
                            // type definition does not
                            // https://nodejs.org/api/buffer.html#buffer_class_method_buffer_bytelength_string_encoding
                            size: (): number => Buffer.byteLength(<string> <{}> source)
                        }
                    }))
                    // Callback with no Error on success
                    .then((): void => { callback(); })
                    .catch(callback);
            }
        );
    }

    /**
     * Run dts-generator, writing the file to a tmp directory and then
     * providing the Buffer back to Webpack
     */
    private compile (): Bluebird<Buffer> {
        // TODO: Create a resizable Buffer instead of writing to a tmp directory?
        return tmpNameAsync()
            .then((fileName: string): Bluebird<Buffer> =>
                dtsGenerator({...this.options, out: fileName})
                    .then((): Bluebird<Buffer> => readFileAsync(fileName)));
    }
}

export default DtsGeneratorPlugin;
export {IDtsGeneratorPluginOptions};
