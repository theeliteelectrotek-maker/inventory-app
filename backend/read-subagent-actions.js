const fs = require('fs');
const transcriptPath = '/Users/theeliteelectrotek/.gemini/antigravity-ide/brain/7c285f53-12b1-4518-b5d7-8e8fd7ac0919/.system_generated/logs/transcript.jsonl';

const lines = fs.readFileSync(transcriptPath, 'utf8').split('\n');
const obj = JSON.parse(lines[88]);
const linesOfContent = obj.content.split('\n');
console.log(linesOfContent.slice(-100).join('\n'));
