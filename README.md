## Open Story Foundation (OSF) Support for VS Code
This is a Visual Studio Code extension that provides syntax highlighting and snippets for the Open Story Foundation (`.osf`) file format. It is designed to enhance the experience of writing and editing OSF files by providing color-coded syntax highlighting and useful code snippets.

## How to run locally

- Press F5 (or go to Run > Start Debugging).
- This will open a new VS Code window (the "[Extension Development Host]").
- In this new window, create or open a file named test.osf.
- Start typing content that matches the patterns you defined in your osf.tmLanguage.json.
- You should see syntax highlighting appear! If not, check:
- - The VS Code "Output" panel (select your extension's name from the dropdown) for errors.
- - The grammar file's JSON validity.
- - The regular expressions in your grammar.
- - That the scopeName and language IDs match between package.json and the grammar file.
- Use the "Developer: Inspect Editor Tokens and Scopes" command (search in Command Palette: Ctrl+Shift+P) while your cursor is on some text in test.osf to see which grammar rule matched and what scope was assigned. This is invaluable for debugging.

You can use this project to debug schema highlight  - https://github.com/open-story/osf-schema
