import { describe, it, expect, beforeAll } from 'vitest'; // Use Vitest globals
import * as path from 'path';
import * as fs from 'fs';
import * as vsctm from 'vscode-textmate';
import * as oniguruma from 'vscode-oniguruma';

// --- Helper function to load Oniguruma  ---
function loadOniguruma(): Promise<vsctm.IOnigLib> {
  // Adjust path relative to this test file's location in src/
  const wasmPath = path.join(__dirname, '../node_modules/vscode-oniguruma/release/onig.wasm');
  try {
    const wasmBin = fs.readFileSync(wasmPath).buffer;
    return oniguruma.loadWASM(wasmBin).then(() => {
      return {
        createOnigScanner(patterns: string[]) { return new oniguruma.OnigScanner(patterns); },
        createOnigString(str: string) { return new oniguruma.OnigString(str); }
      };
    });
  } catch (err) {
    console.error(`Error loading WASM at ${wasmPath}: ${err}`);
    throw err;
  }
}

// --- Helper function to tokenize ---
async function tokenizeLine(grammar: vsctm.IGrammar, line: string): Promise<vsctm.IToken[]> {
  let ruleStack = vsctm.INITIAL;
  const lineTokens = grammar.tokenizeLine(line, ruleStack);
  return lineTokens.tokens;
}

// --- NEW Helper function to simplify token output for snapshots ---
interface SimplifiedToken {
  text: string;
  scopes: string[];
}

/**
 * Creates a more readable representation of tokens for snapshots.
 * Includes the text content of each token.
 */
function simplifyTokens(line: string, tokens: vsctm.IToken[]): SimplifiedToken[] {
  return tokens.map(token => ({
    // Extract the text substring covered by the token
    text: line.substring(token.startIndex, token.endIndex),
    // Keep the scopes array
    scopes: token.scopes
  }));
}

// --- Test Suite ---
describe('OSF Grammar Snapshot Tests', () => {
  let grammar: vsctm.IGrammar;

  // --- Load Grammar (same beforeAll block as before) ---
  beforeAll(async () => {
    try {
      const onigLib = await loadOniguruma();
      console.log('Oniguruma WASM loaded successfully.');

      const registry = new vsctm.Registry({
        onigLib: Promise.resolve(onigLib),
        loadGrammar: async (scopeName: string): Promise<vsctm.IRawGrammar | null> => {
          if (scopeName === 'source.osf') {
            const grammarPath = path.resolve(__dirname, '../syntaxes/osf.tmLanguage.json');
            console.log(`Loading grammar for tests from: ${grammarPath}`);
            try {
              const fileContent = fs.readFileSync(grammarPath, 'utf8');
              return vsctm.parseRawGrammar(fileContent, grammarPath);
            } catch (error) {
              console.error(`Error loading grammar file: ${error}`);
              return null;
            }
          }
          console.warn(`Unknown scope name requested: ${scopeName}`);
          return null;
        }
      });

      console.log('Loading grammar: source.osf');
      const loadedGrammar = await registry.loadGrammar('source.osf');
      if (!loadedGrammar) {
        throw new Error("Could not load source.osf grammar from registry.");
      }
      grammar = loadedGrammar;
      console.log("Grammar loaded successfully for tests.");

    } catch (error) {
      console.error("Error during beforeAll setup:", error);
      throw error;
    }
  }, 20000); // Timeout for setup

  // --- Helper Function for Line Snapshot Testing ---
  /**
   * Tokenizes a line, simplifies the result, and compares it to a snapshot.
   */
  async function expectLineSnapshot(line: string) {
    const tokens = await tokenizeLine(grammar, line);
    const simplifiedResult = simplifyTokens(line, tokens);
    // This is the core change: Use toMatchSnapshot()
    expect(simplifiedResult).toMatchSnapshot();
  }


  // --- Individual Test Cases (now much simpler) ---

  it('Should snapshot apiVersion header', async () => {
    await expectLineSnapshot('apiVersion: dialogue/v1');
  });

  it('Should snapshot node declaration', async () => {
    await expectLineSnapshot('node node_1:');
  });

  it('Should snapshot node property (key/value)', async () => {
    await expectLineSnapshot('  character: none');
  });

  it('Should snapshot node property (key only - text)', async () => {
    // Test case with value essentially empty after colon
    await expectLineSnapshot('  text: ');
  });

  it('Should snapshot indented text block', async () => {
    // Use a representative line from your example
    await expectLineSnapshot('        warm glow over the battlefield. The air was thick ');
  });

  it('Should snapshot double-quoted string property', async () => {
    await expectLineSnapshot('  message: "Hello World!"');
  });

  it('Should snapshot string with escape sequence', async () => {
    await expectLineSnapshot('  escaped: "Say \\"Hi!\\""');
  });

  it('Should snapshot line with trailing whitespace', async () => {
    await expectLineSnapshot('  prop: value  ');
  });

  // Add more test cases for various syntax structures...
  // Example: A line that *shouldn't* match specific rules
  // it('Should snapshot a plain line', async () => {
  //    await expectLineSnapshot('This is just some text.');
  // });

});
