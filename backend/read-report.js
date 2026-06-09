const fs = require('fs');
const readline = require('readline');
const transcriptPath = '/Users/theeliteelectrotek/.gemini/antigravity-ide/brain/7c285f53-12b1-4518-b5d7-8e8fd7ac0919/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  output: process.stdout,
  terminal: false
});

let lines = [];
rl.on('line', (line) => {
  lines.push(line);
});

rl.on('close', () => {
  for (let i = 80; i < 95; i++) {
    if (lines[i]) {
      const obj = JSON.parse(lines[i]);
      console.log(`=== Line ${i} (Type: ${obj.type}, Source: ${obj.source}) ===`);
      console.log(JSON.stringify(obj, null, 2).substring(0, 1000));
    }
  }
});
