import { deepEqual } from 'assert';
import ChildProcessTransformer from '../../src/ChildProcessTransformer';
import Config from '../../src/Config';
import Environment from '../../src/Environment';
import { installAsyncIterator } from '../../src/polyfills';
import TransformRunner, {
  Source,
  SourceTransformResult
} from '../../src/TransformRunner';

describe('TransformRunner', function() {
  async function run(runner: TransformRunner) {
    let result: Array<SourceTransformResult> = [];

    installAsyncIterator();

    for await (let transformResult of runner.run()) {
      result.push(transformResult);
    }

    return result;
  }

  it('generates a result for each source by calling the transformer', async function() {
    let sources = [new Source('a.js', 'a;'), new Source('b.js', 'b;')];
    let runner = new TransformRunner(sources, {
      async ready(): Promise<void> {},
      async cleanup(): Promise<void> {},

      async transform(filepath: string, content: string): Promise<string> {
        return content.toUpperCase();
      }
    });

    deepEqual(await run(runner), [
      new SourceTransformResult(sources[0], 'A;', null),
      new SourceTransformResult(sources[1], 'B;', null)
    ]);
  });

  it('collects errors for each failed source transform', async function() {
    let sources = [new Source('fails.js', 'invalid syntax')];
    let runner = new TransformRunner(sources, {
      async ready(): Promise<void> {},
      async cleanup(): Promise<void> {},

      async transform(filepath: string, content: string): Promise<string> {
        throw new Error(`unable to process ${filepath}: ${content}`);
      }
    });

    deepEqual(await run(runner), [
      new SourceTransformResult(
        sources[0],
        null,
        new Error('unable to process fails.js: invalid syntax')
      )
    ]);
  });

  it('can run with ChildProcessTransformer', async function() {
    let sources = [new Source('a.js', '3 + 4;')];
    let environment = Environment.fromConfig(new Config());
    let runner = new TransformRunner(
      sources,
      new ChildProcessTransformer(environment)
    );

    deepEqual(await run(runner), [
      new SourceTransformResult(sources[0], '3 + 4;', null)
    ]);
  });
});
