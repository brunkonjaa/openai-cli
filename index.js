#!/usr/bin/env node

/*
 * index.js
 * Bruno Suric
 * 02/04/2026
 * Node.js CLI tool for interacting with OpenAI API.
 * Supports prompt input, response length modes, task modes,
 * file input, clipboard copy, saving output, raw JSON output,
 * model override, chat mode, explain mode, and analyze mode.
 */

import OpenAI from "openai";
import clipboard from "clipboardy";
import fs from "fs";
import path from "path";
import readline from "readline";

const VALID_TASK_MODES = ["solve", "review", "explain"];
const VALID_RESPONSE_LENGTHS = ["short", "medium", "long"];
const VALID_ANALYZE_MODES = ["explain", "debug", "optimize"];
const ANALYZE_FILE_EXTENSIONS = [".js", ".json", ".md"];
const IGNORED_DIRECTORIES = ["node_modules", ".git", "outputs"];

const TASK_MODE_PROMPTS = {
  solve: "Solve the user's task directly and clearly. Be accurate, concise, and practical.",
  review: "Review the user's content critically. Identify weaknesses, risks, errors, and specific improvements.",
  explain: "Explain the topic clearly in a structured, easy-to-follow way, suitable for learning."
};

if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set.");
  process.exit(1);
}

const client = new OpenAI();
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

function createDefaultConfig() {
  return {
    explainFile: null,
    analyzeFile: null,
    analyzeMode: "explain",
    mode: "medium",
    copyFlag: false,
    saveFlag: false,
    saveFile: null,
    model: DEFAULT_MODEL,
    systemInstruction: null,
    fileInput: null,
    rawFlag: false,
    chatFlag: false,
    noPrintFlag: false,
    helpFlag: false,
    taskMode: null
  };
}

function parseArgs(rawArgs) {
  const config = createDefaultConfig();
  const cleanedArgs = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];

    if (arg === "--chat") {
      config.chatFlag = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      config.helpFlag = true;
      continue;
    }

    if (arg === "--copy") {
      config.copyFlag = true;
      continue;
    }

    if (arg === "--raw") {
      config.rawFlag = true;
      continue;
    }

    if (arg === "--no-print") {
      config.noPrintFlag = true;
      continue;
    }

    if (arg === "--save") {
      config.saveFlag = true;
      const next = rawArgs[i + 1];

      if (next && !next.startsWith("--")) {
        config.saveFile = next;
        i++;
      }

      continue;
    }

    if (arg === "--model") {
      const next = rawArgs[i + 1];

      if (!next || next.startsWith("--")) {
        console.error("Error: --model requires a model name.");
        process.exit(1);
      }

      config.model = next;
      i++;
      continue;
    }

    if (arg === "--mode") {
      const next = rawArgs[i + 1];

      if (!next || next.startsWith("--")) {
        console.error("Error: --mode requires a mode name.");
        process.exit(1);
      }

      config.taskMode = next;
      i++;
      continue;
    }

    if (arg === "--system") {
      const next = rawArgs[i + 1];

      if (!next || next.startsWith("--")) {
        console.error("Error: --system requires an instruction string.");
        process.exit(1);
      }

      config.systemInstruction = next;
      i++;
      continue;
    }

    if (arg === "--file") {
      const next = rawArgs[i + 1];

      if (!next || next.startsWith("--")) {
        console.error("Error: --file requires a filename.");
        process.exit(1);
      }

      config.fileInput = next;
      i++;
      continue;
    }

    if (arg === "--explain") {
      const next = rawArgs[i + 1];

      if (!next || next.startsWith("--")) {
        console.error("Error: --explain requires a filename.");
        process.exit(1);
      }

      config.explainFile = next;
      i++;
      continue;
    }

    if (arg === "--analyze") {
      const next = rawArgs[i + 1];

      if (!next || next.startsWith("--")) {
        console.error("Error: --analyze requires a filename.");
        process.exit(1);
      }

      config.analyzeFile = next;

      const modeArg = rawArgs[i + 2];
      if (modeArg && !modeArg.startsWith("--")) {
        config.analyzeMode = modeArg;
        i++;
      }

      i++;
      continue;
    }

    if (VALID_RESPONSE_LENGTHS.includes(arg)) {
      config.mode = arg;
      continue;
    }

    cleanedArgs.push(arg);
  }

  validateConfig(config);

  return { config, cleanedArgs };
}

function validateConfig(config) {
  if (config.taskMode && !VALID_TASK_MODES.includes(config.taskMode)) {
    console.error(`Error: invalid mode "${config.taskMode}". Use solve, review, or explain.`);
    process.exit(1);
  }

  if (!VALID_ANALYZE_MODES.includes(config.analyzeMode)) {
    console.error(`Error: invalid analyze mode "${config.analyzeMode}". Use explain, debug, or optimize.`);
    process.exit(1);
  }
}

function printHelp() {
  console.log(`
OpenAI CLI

Usage:
  node index.js "your prompt here"
  node index.js "your prompt here" --mode explain
  node index.js --file prompt.txt --mode review
  node index.js "your prompt here" short
  node index.js "your prompt here" --copy
  node index.js "your prompt here" --save
  node index.js "your prompt here" --save notes.txt
  node index.js "your prompt here" --copy --save
  node index.js --file prompt.txt
  node index.js "your prompt here" --model gpt-4.1
  node index.js "your prompt here" --system "Answer like a lecturer"
  node index.js "your prompt here" --raw
  node index.js "your prompt here" --no-print
  node index.js --chat
  node index.js --explain index.js
  node index.js --analyze index.js debug
  node index.js --analyze . debug

Response lengths:
  short     One short sentence
  medium    2-3 clear sentences
  long      A few solid paragraphs

Task modes:
  solve     Direct, practical problem solving
  review    Critical review with improvements
  explain   Structured learning-style explanation

Analyze modes:
  explain   General code explanation with design notes
  debug     Find bugs, risky logic, and edge cases
  optimize  Suggest performance and structure improvements

Flags:
  --help             Show help
  --copy             Copy output to clipboard
  --save             Save output using automatic timestamp filename
  --save <file>      Save output to a specific file
  --model <name>     Override model for this run
  --mode <name>      Set task mode: solve, review, or explain
  --system <text>    Custom system instruction
  --file <file>      Read prompt from a text file
  --raw              Print raw JSON response and save it
  --no-print         Do not print normal output to terminal
  --chat             Start interactive chat mode
  --explain <file>   Explain a code or text file with structured output
  --analyze <file>   Analyze a file or project in explain/debug/optimize mode

Examples:
  node index.js "What is DNS tunneling?"
  node index.js "What is DNS tunneling?" long
  node index.js "What is DNS tunneling?" --copy --save
  node index.js "Explain subnetting" --save subnetting.txt
  node index.js --file prompt.txt --copy
  node index.js "Explain DHCP starvation" --model gpt-4.1
  node index.js "Explain DNS tunneling" --system "Answer like an NFQ Level 8 lecturer"
  node index.js --chat
  node index.js --explain index.js
  node index.js --explain index.js --copy
  node index.js --explain index.js --save explanation.txt
  node index.js --analyze index.js debug
  node index.js --analyze . explain
  node index.js --analyze . optimize --save analysis.txt
  node index.js "Explain subnetting" --mode explain
  node index.js "Review this paragraph" --mode review
  node index.js --file prompt.txt --mode solve
`);
}

function ensureOutputsDir() {
  const dir = path.join(process.cwd(), "outputs");

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

function timestampForFilename() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd}-${hh}-${min}-${ss}`;
}

function readPromptFromFile(filename) {
  const fullPath = path.resolve(filename);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: file not found: ${filename}`);
    process.exit(1);
  }

  return fs.readFileSync(fullPath, "utf8").trim();
}

function collectFiles(dir) {
  let results = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
      if (IGNORED_DIRECTORIES.includes(item)) {
        continue;
      }

      results = results.concat(collectFiles(fullPath));
      continue;
    }

    if (ANALYZE_FILE_EXTENSIONS.some((ext) => item.endsWith(ext))) {
      results.push(fullPath);
    }
  }

  return results;
}

function readMultipleFiles(files, baseDir) {
  let output = "";

  for (const file of files) {
    const relativeName = path.relative(baseDir, file) || path.basename(file);

    try {
      const content = fs.readFileSync(file, "utf8").trim();
      output += `=== ${relativeName} ===\n${content}\n\n`;
    } catch {
      output += `=== ${relativeName} ===\n[ERROR READING FILE]\n\n`;
    }
  }

  return output.trim();
}

function getInstruction(config) {
  if (config.systemInstruction) {
    return config.systemInstruction;
  }

  if (config.taskMode) {
    return TASK_MODE_PROMPTS[config.taskMode];
  }

  if (config.mode === "short") {
    return "Answer in one short sentence only.";
  }

  if (config.mode === "long") {
    return "Answer clearly in a few solid paragraphs, without bullet points unless necessary.";
  }

  return "Answer in 2-3 clear sentences, no bullet points.";
}

function getMaxTokens(config) {
  if (!config.explainFile && !config.analyzeFile) {
    if (config.mode === "short") return 120;
    if (config.mode === "long") return 2200;
    return 500;
  }

  const targetFile = config.explainFile || config.analyzeFile;
  const fullPath = path.resolve(targetFile);
  const targetStats = fs.statSync(fullPath);

  if (targetStats.isDirectory()) {
    if (config.mode === "short") return 400;
    if (config.mode === "long") return 2200;
    return 1200;
  }

  const content = readPromptFromFile(targetFile);
  const estimatedInputTokens = Math.ceil(content.length / 4);

  let multiplier = 0.25;
  if (config.mode === "medium") multiplier = 0.6;
  if (config.mode === "long") multiplier = 1.0;

  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * multiplier);

  return Math.max(400, Math.min(3000, estimatedOutputTokens));
}

function getQuestion(config, cleanedArgs) {
  if (config.analyzeFile) {
    const fullPath = path.resolve(config.analyzeFile);
    const targetStats = fs.statSync(fullPath);

    let instruction = "";

    if (config.analyzeMode === "debug") {
      instruction = "Identify bugs, errors, edge cases, and risky logic.";
    } else if (config.analyzeMode === "optimize") {
      instruction = "Suggest performance, readability, and structural improvements.";
    } else {
      instruction = "Explain the code clearly and highlight important design decisions.";
    }

    if (targetStats.isDirectory()) {
      const files = collectFiles(fullPath);

      if (files.length === 0) {
        return `Analyze the following project directory.

Mode: ${config.analyzeMode}

Focus:
- ${instruction}
- Be direct and technical
- Use bullet points if helpful

Project path: ${path.basename(fullPath)}

No supported files were found.`;
      }

      const combinedContent = readMultipleFiles(files, fullPath);

      return `Analyze the following project.

Mode: ${config.analyzeMode}

Focus:
- ${instruction}
- Be direct and technical
- Use bullet points if helpful

Project path: ${path.basename(fullPath)}
Files included: ${files.length}

Project content:
\n\n${combinedContent}`;
    }

    const content = readPromptFromFile(config.analyzeFile);

    return `Analyze the following file.

Mode: ${config.analyzeMode}

Focus:
- ${instruction}
- Be direct and technical
- Use bullet points if helpful

File: ${path.basename(config.analyzeFile)}

Code:
\`\`\`
${content}
\`\`\``;
  }

  if (config.explainFile) {
    const content = readPromptFromFile(config.explainFile);

    return `Explain the following file clearly for a beginner-to-intermediate developer.

Focus on:
1. What this file does overall
2. The purpose of the main sections
3. How the logic flows step by step
4. Important functions, flags, or decisions
5. Anything a student should learn from this code

File name: ${path.basename(config.explainFile)}

Code:
\`\`\`
${content}
\`\`\``;
  }

  if (config.fileInput) {
    return readPromptFromFile(config.fileInput);
  }

  const prompt = cleanedArgs.join(" ").trim();

  if (!prompt) {
    console.error("Error: no prompt provided.");
    process.exit(1);
  }

  return prompt;
}

function extractOutput(response) {
  return (
    response.output_text ||
    response.output
      ?.map((item) => item.content?.map((part) => part.text || "").join(""))
      .join("") ||
    "No response generated."
  );
}

function resolveSavePath(filename) {
  const outputsDir = ensureOutputsDir();

  if (!filename) {
    return path.join(outputsDir, `output-${timestampForFilename()}.txt`);
  }

  if (path.isAbsolute(filename)) {
    return filename;
  }

  return path.join(outputsDir, filename);
}

function getActiveInstructions(config) {
  if (config.analyzeFile) {
    if (config.analyzeMode === "debug") {
      return "Analyze code like a careful debugging assistant. Focus on bugs, logic flaws, risky assumptions, edge cases, and weak validation. Use clear headings.";
    }

    if (config.analyzeMode === "optimize") {
      return "Analyze code like a developer assistant. Focus on optimization, readability, maintainability, duplication, and structure. Use clear headings.";
    }

    return "Explain code clearly in structured sections with headings. Highlight design decisions, code flow, and what a student should learn.";
  }

  if (config.explainFile) {
    return "Explain clearly in structured sections with headings. Focus on overall purpose, logic flow, important functions, and what a student should learn.";
  }

  return getInstruction(config);
}

async function startChatMode(config) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "You> "
    });

    console.log(`Using model: ${config.model}\n`);
    console.log('Chat mode started. Type "exit" to quit.');

    rl.prompt();

    rl.on("line", async (line) => {
      const input = line.trim();

      if (!input) {
        rl.prompt();
        return;
      }

      if (input.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      try {
        const response = await client.responses.create({
          model: config.model,
          instructions: getInstruction(config),
          input,
          max_output_tokens: getMaxTokens(config)
        });

        const output = extractOutput(response);

        if (config.rawFlag) {
          console.log(JSON.stringify(response, null, 2));

          const rawPath = resolveSavePath(`raw-${timestampForFilename()}.json`);
          fs.writeFileSync(rawPath, JSON.stringify(response, null, 2), "utf8");
          console.log(`Raw response saved to ${rawPath}`);
        } else if (!config.noPrintFlag) {
          console.log(`AI> ${output}\n`);
        }

        if (config.copyFlag) {
          clipboard.writeSync(output);
          console.log("Copied to clipboard\n");
        }

        if (config.saveFlag) {
          const finalPath = resolveSavePath(config.saveFile);
          fs.writeFileSync(finalPath, output, "utf8");
          console.log(`Saved to ${finalPath}\n`);
        }
      } catch (err) {
        console.error("Error:", err.message);
      }

      rl.prompt();
    });

    rl.on("close", () => {
      console.log("Chat ended.");
      resolve();
    });
  });
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const { config, cleanedArgs } = parseArgs(rawArgs);

  if (config.helpFlag) {
    printHelp();
    process.exit(0);
  }

  if (config.chatFlag) {
    await startChatMode(config);
    process.exit(0);
  }

  const question = getQuestion(config, cleanedArgs);

  try {
    console.log(`Using model: ${config.model}`);

    const response = await client.responses.create({
      model: config.model,
      instructions: getActiveInstructions(config),
      input: question,
      max_output_tokens: getMaxTokens(config)
    });

    const output = extractOutput(response);

    if (config.rawFlag) {
      console.log(JSON.stringify(response, null, 2));

      const rawPath = resolveSavePath(`raw-${timestampForFilename()}.json`);
      fs.writeFileSync(rawPath, JSON.stringify(response, null, 2), "utf8");
      console.log(`Raw response saved to ${rawPath}`);
    } else if (!config.noPrintFlag) {
      console.log(output);
    }

    if (config.copyFlag) {
      clipboard.writeSync(output);
      console.log("\nCopied to clipboard");
    }

    if (config.saveFlag) {
      const finalPath = resolveSavePath(config.saveFile);
      fs.writeFileSync(finalPath, output, "utf8");
      console.log(`Saved to ${finalPath}`);
    }
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
}

await main();
