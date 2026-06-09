const fs = require('fs');
const readline = require('readline');
const path = require('path');

const transcriptPath = '/Users/theeliteelectrotek/.gemini/antigravity-ide/brain/7c285f53-12b1-4518-b5d7-8e8fd7ac0919/.system_generated/logs/transcript.jsonl';

const rl = readline.createInterface({
  input: fs.createReadStream(transcriptPath),
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const obj = JSON.parse(line);
    // Find step that contains console logs or browser subagent report
    if (obj.tool_calls) {
      for (const call of obj.tool_calls) {
        if (call.name === 'capture_browser_console_logs' || call.name === 'browser_subagent') {
          console.log("=== TOOL CALL ===", call.name);
          console.log(JSON.stringify(call.args, null, 2));
        }
      }
    }
    if (obj.content && (obj.content.includes("console") || obj.content.includes("log") || obj.content.includes("error"))) {
      if (obj.content.length < 1000) {
        console.log("=== CONTENT ===");
        console.log(obj.content);
      }
    }
  } catch (e) {}
});
