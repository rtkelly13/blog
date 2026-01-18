import { mermaidToAscii } from '../src/index';

const simpleLR = `graph LR
  A --> B
  B --> C`;

const simpleTD = `graph TD
  Start --> Process
  Process --> End`;

const labeled = `graph LR
  A -->|label| B`;

console.log('=== Simple LR ===');
console.log(mermaidToAscii(simpleLR));

console.log('\n=== Simple TD ===');
console.log(mermaidToAscii(simpleTD));

console.log('\n=== Labeled Edge ===');
console.log(mermaidToAscii(labeled));

console.log('\n=== ASCII Mode ===');
console.log(mermaidToAscii(simpleLR, { asciiOnly: true }));
