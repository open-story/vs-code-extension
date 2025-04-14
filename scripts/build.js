const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const yamlFilePath = path.join(__dirname, '../syntaxes/osf.tmLanguage.yaml');
const jsonFilePath = path.join(__dirname, '../syntaxes/osf.tmLanguage.json');

try {
  console.log(`Reading YAML grammar from: ${yamlFilePath}`);
  const yamlContent = fs.readFileSync(yamlFilePath, 'utf8');
  const jsonObject = yaml.load(yamlContent); // or yaml.parse(yamlContent) for yamljs

  console.log(`Writing JSON grammar to: ${jsonFilePath}`);
  fs.writeFileSync(jsonFilePath, JSON.stringify(jsonObject, null, '\t')); // Use '\t' or '  ' for indentation

  console.log('Grammar conversion successful!');
} catch (e) {
  console.error('Error converting grammar:', e);
  process.exit(1);
}
