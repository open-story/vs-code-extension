import { describe, it, expect, beforeAll } from 'vitest'; // Use Vitest globals
import * as path from 'path';
import * as fs from 'fs';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';


// Helper function to load the Oniguruma library (WASM)
// You might need to copy the wasm file to your output dir during build
function loadOniguruma(): Promise<vsctm.IOnigLib> {
  const wasmPath = path.join(__dirname, '../../node_modules/vscode-oniguruma/release/onig.wasm');
  const wasmBin = fs.readFileSync(wasmPath).buffer;
  return oniguruma.loadWASM(wasmBin).then(() => {
    return {
      createOnigScanner(patterns: string[]) { return new oniguruma.OnigScanner(patterns); },
      createOnigString(str: string) { return new oniguruma.OnigString(str); }
    };
  });
}

// Helper function to tokenize a line
async function tokenizeLine(grammar: vsctm.IGrammar, line: string): Promise<vsctm.IToken[]> {
  let ruleStack = vsctm.INITIAL;
  const lineTokens = grammar.tokenizeLine(line, ruleStack);
  return lineTokens.tokens;
}

let grammar: vsctm.IGrammar;
beforeEach(async () => {
  const registry = new vsctm.Registry({
    onigLib: Promise.resolve(await loadOniguruma()), // Load the Oniguruma library
    // Function to load grammars by scope name
    loadGrammar: async (scopeName: string): Promise<vsctm.IRawGrammar | null> => {
      if (scopeName === 'source.osf') {
        // Make sure the path points to the *compiled* JSON grammar
        const grammarPath = path.join(__dirname, '../../syntaxes/osf.tmLanguage.json');
        console.log(`Loading grammar for tests from: ${grammarPath}`);
        try {
          const fileContent = fs.readFileSync(grammarPath, 'utf8');
          return vsctm.parseRawGrammar(fileContent, grammarPath);
        } catch (error) {
          console.error(`Error loading grammar: ${error}`);
          return null;
        }
      }
      console.warn(`Unknown scope name: ${scopeName}`);
      return null;
    }
  });

  // Load the grammar for 'source.osf'
  const loadedGrammar = await registry.loadGrammar('source.osf');
  if (!loadedGrammar) {
    throw new Error("Could not load source.osf grammar");
  }
  grammar = loadedGrammar;
  console.log("Grammar loaded successfully for tests.");
})

// --- Test Suite ---

describe('OSF Grammar Tests', () => {
  let grammar: vsctm.IGrammar;

  test('Should tokenize apiVersion header', async () => {
    const line = 'apiVersion: dialogue/v1';
    const tokens = await tokenizeLine(grammar, line);

    // Example Assertions (adjust based on your scopes)
    assert.strictEqual(tokens.length, 3, 'Expected 3 tokens'); // apiVersion, :, dialogue/v1
    assert.deepStrictEqual(tokens[0].scopes, ['source.osf', 'meta.header.osf', 'entity.name.tag.osf'], 'Token 1 scope');
    assert.strictEqual(tokens[0].startIndex, 0, 'Token 1 start');
    assert.strictEqual(tokens[0].endIndex, 10, 'Token 1 end'); // 'apiVersion'

    assert.deepStrictEqual(tokens[1].scopes, ['source.osf', 'meta.header.osf'], 'Token 2 scope (colon)');
    assert.strictEqual(tokens[1].startIndex, 10, 'Token 2 start');
    assert.strictEqual(tokens[1].endIndex, 11, 'Token 2 end'); // ':'

    assert.deepStrictEqual(tokens[2].scopes, ['source.osf', 'meta.header.osf', 'string.unquoted.value.osf'], 'Token 3 scope');
    assert.strictEqual(tokens[2].startIndex, 12, 'Token 3 start'); // Skip space
    assert.strictEqual(tokens[2].endIndex, 23, 'Token 3 end'); // 'dialogue/v1'
  });

  test('Should tokenize node declaration', async () => {
    const line = 'node node_1:';
    const tokens = await tokenizeLine(grammar, line);

    assert.strictEqual(tokens.length, 3, 'Expected 3 tokens'); // node, node_1, :
    assert.deepStrictEqual(tokens[0].scopes, ['source.osf', 'meta.node.declaration.osf', 'keyword.control.osf'], 'Token 1 scope (node)');
    assert.deepStrictEqual(tokens[1].scopes, ['source.osf', 'meta.node.declaration.osf', 'entity.name.function.osf'], 'Token 2 scope (node_1)');
    assert.deepStrictEqual(tokens[2].scopes, ['source.osf', 'meta.node.declaration.osf'], 'Token 3 scope (:)');
  });

  test('Should tokenize node property', async () => {
    const line = '  character: none';
    const tokens = await tokenizeLine(grammar, line);

    assert.strictEqual(tokens.length, 4, 'Expected 4 tokens'); // indent, character, :, none
    // Note: vscode-textmate often includes whitespace tokens depending on the regex
    assert.deepStrictEqual(tokens[1].scopes, ['source.osf', 'meta.property.osf', 'entity.name.tag.osf'], 'Token 2 scope (character)');
    assert.deepStrictEqual(tokens[3].scopes, ['source.osf', 'meta.property.osf', 'string.unquoted.value.osf'], 'Token 4 scope (none)');

  });

  test('Should tokenize indented text block', async () => {
    const line = '        The sun was setting...'; // 8 spaces
    const tokens = await tokenizeLine(grammar, line);
    assert.strictEqual(tokens.length, 1, 'Expected 1 token for text block line');
    assert.deepStrictEqual(tokens[0].scopes, ['source.osf', 'string.unquoted.block.osf'], 'Text block scope');
  });

  test('Should tokenize double-quoted string', async () => {
    const line = '  message: "Hello World!"';
    const tokens = await tokenizeLine(grammar, line);
    // Find the string token (may not be the last one if there's trailing whitespace)
    const stringToken = tokens.find(t => t.scopes.includes('string.quoted.double.osf'));
    assert.ok(stringToken, "Didn't find double-quoted string token");
    assert.deepStrictEqual(stringToken?.scopes, ['source.osf', 'string.quoted.double.osf'], 'String scope');
    assert.strictEqual(stringToken?.startIndex, 12, 'String start index');
    assert.strictEqual(stringToken?.endIndex, 26, 'String end index');
  });
});
