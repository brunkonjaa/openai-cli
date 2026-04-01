#!/usr/bin/env node

/*
 * index.js
 * Bruno Suric
 * 02/04/2026
 * Node.js CLI tool for interacting with OpenAI API.
 * Supports prompt input, modes (short/medium/long), file input,
 * clipboard copy, saving output, raw JSON output, model override,
 * chat mode, explain mode, and analyze mode.
 */

import OpenAI from "openai";
import clipboard from "clipboardy";
import fs from "fs";
import path from "path";
import readline from "readline";

if (!process.env.OPENAI_API_KEY) {
  console.error("Error: OPENAI_API_KEY is not set.");
  process.exit(1);
}

const client = new OpenAI();

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const rawArgs = process.argv.slice(2);

let explainFile = null;
let analyzeFile = null;
let analyzeMode = "explain";
let mode = "medium";
let copyFlag = false;
let saveFlag = false;
let saveFile = null;
let model = DEFAULT_MODEL;
let systemInstruction = null;
let fileInput = null;
let rawFlag = false;
let noPrintFlag = false;
let helpFlag = false;
let chatFlag = false;

const cleanedArgs = [];

for (let i = 0; i < rawArgs.length; i++) {
  const arg = rawArgs[i];

  if (arg === "--chat") {
    chatFlag = true;
    continue;
  }

  if (arg === "--help" || arg === "-h") {
    helpFlag = true;
    continue;
  }

  if (arg === "--copy") {
    copyFlag = true;
    continue;
  }

  if (arg === "--raw") {
    rawFlag = true;
    continue;
  }

  if (arg === "--no-print") {
    noPrintFlag = true;
    continue;
  }

  if (arg === "--save") {
    saveFlag = true;
    const next = rawArgs[i + 1];

    if (next && !next.startsWith("--")) {
      saveFile = next;
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

    model = next;
    i++;
    continue;
  }

  if (arg === "--system") {
    const next = rawArgs[i + 1];

    if (!next || next.startsWith("--")) {
      console.error("Error: --system requires an instruction string.");
      process.exit(1);
    }

    systemInstruction = next;
    i++;
    continue;
  }

  if (arg === "--file") {
    const next = rawArgs[i + 1];

    if (!next || next.startsWith("--")) {
      console.error("Error: --file requires a filename.");
      process.exit(1);
    }

    fileInput = next;
    i++;
    continue;
  }

  if (arg === "--explain") {
    const next = rawArgs[i + 1];

    if (!next || next.startsWith("--")) {
      console.error("Error: --explain requires a filename.");
      process.exit(1);
    }

    explainFile = next;
    i++;
    continue;
  }

  if (arg === "--analyze") {
    const next = rawArgs[i + 1];

    if (!next || next.startsWith("--")) {
      console.error("Error: --analyze requires a filename.");
      process.exit(1);
    }

    analyzeFile = next;

    const modeArg = rawArgs[i + 2];
    if (modeArg && !modeArg.startsWith("--")) {
      analyzeMode = modeArg;
      i++;
    }

    i++;
    continue;
  }

  if (arg === "short" || arg === "medium" || arg === "long") {
    mode = arg;
    continue;
  }

  cleanedArgs.push(arg);
}

if (helpFlag) {
  console.log(`
OpenAI CLI

Usage:
  node index.js "your prompt here"
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

Modes:
  short     One short sentence
  medium    2-3 clear sentences
  long      A few solid paragraphs

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
  --system <text>    Custom system instruction
  --file <file>      Read prompt from a text file
  --raw              Print raw JSON response and save it
  --no-print         Do not print normal output to terminal
  --chat             Start interactive chat mode
  --explain <file>   Explain a code or text file with structured output
  --analyze <file>   Analyze a file in explain/debug/optimize mode

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
  node index.js --analyze index.js optimize --save analysis.txt
`);
  process.exit(0);
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

function getInstruction(selectedMode, customSystemInstruction) {
  if (customSystemInstruction) {
    return customSystemInstruction;
  }

  if (selectedMode === "short") {
    return "Answer in one short sentence only.";
  }

  if (selectedMode === "long") {
    return "Answer clearly in a few solid paragraphs, without bullet points unless necessary.";
  }

  return "Answer in 2-3 clear sentences, no bullet points.";
}

function getMaxTokens(selectedMode) {
  if (!explainFile && !analyzeFile) {
    if (selectedMode === "short") return 60;
    if (selectedMode === "long") return 300;
    return 120;
  }

  const targetFile = explainFile || analyzeFile;
  const content = readPromptFromFile(targetFile);
  const estimatedInputTokens = Math.ceil(content.length / 4);

  let multiplier = 0.25;
  if (selectedMode === "medium") multiplier = 0.6;
  if (selectedMode === "long") multiplier = 1.0;

  const estimatedOutputTokens = Math.ceil(estimatedInputTokens * multiplier);

  return Math.max(400, Math.min(3000, estimatedOutputTokens));
}

function readPromptFromFile(filename) {
  const fullPath = path.resolve(filename);

  if (!fs.existsSync(fullPath)) {
    console.error(`Error: file not found: ${filename}`);
    process.exit(1);
  }

  return fs.readFileSync(fullPath, "utf8").trim();
}

function getQuestion() {
  if (analyzeFile) {
    const content = readPromptFromFile(analyzeFile);

    let instruction = "";

    if (analyzeMode === "debug") {
      instruction = "Identify bugs, errors, edge cases, and risky logic.";
    } else if (analyzeMode === "optimize") {
      instruction = "Suggest performance, readability, and structural improvements.";
    } else {
      instruction = "Explain the code clearly and highlight important design decisions.";
    }

    return `Analyze the following file.

Mode: ${analyzeMode}

Focus:
- ${instruction}
- Be direct and technical
- Use bullet points if helpful

File: ${path.basename(analyzeFile)}

Code:
\`\`\`
${content}
\`\`\``;
  }

  if (explainFile) {
    const content = readPromptFromFile(explainFile);

    return `Explain the following file clearly for a beginner-to-intermediate developer.

Focus on:
1. What this file does overall
2. The purpose of the main sections
3. How the logic flows step by step
4. Important functions, flags, or decisions
5. Anything a student should learn from this code

File name: ${path.basename(explainFile)}

Code:
\`\`\`
${content}
\`\`\``;
  }

  if (fileInput) {
    return readPromptFromFile(fileInput);
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
      ?.map((item) =>
        item.content
          ?.map((part) => part.text || "")
          .join("")
      )
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

function getActiveInstructions() {
  if (analyzeFile) {
    if (analyzeMode === "debug") {
      return "Analyze code like a careful debugging assistant. Focus on bugs, logic flaws, risky assumptions, edge cases, and weak validation. Use clear headings.";
    }

    if (analyzeMode === "optimize") {
      return "Analyze code like a developer assistant. Focus on optimization, readability, maintainability, duplication, and structure. Use clear headings.";
    }

    return "Explain code clearly in structured sections with headings. Highlight design decisions, code flow, and what a student should learn.";
  }

  if (explainFile) {
    return "Explain clearly in structured sections with headings. Focus on overall purpose, logic flow, important functions, and what a student should learn.";
  }

  return getInstruction(mode, systemInstruction);
}

async function startChatMode() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: "You> "
    });

    console.log(`Using model: ${model}\n`);
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
          model,
          instructions: getInstruction(mode, systemInstruction),
          input,
          max_output_tokens: getMaxTokens(mode)
        });

        const output = extractOutput(response);

        if (rawFlag) {
          console.log(JSON.stringify(response, null, 2));

          const rawPath = resolveSavePath(`raw-${timestampForFilename()}.json`);
          fs.writeFileSync(rawPath, JSON.stringify(response, null, 2), "utf8");
          console.log(`Raw response saved to ${rawPath}`);
        } else if (!noPrintFlag) {
          console.log(`AI> ${output}\n`);
        }

        if (copyFlag) {
          clipboard.writeSync(output);
          console.log("Copied to clipboard\n");
        }

        if (saveFlag) {
          const finalPath = resolveSavePath(saveFile);
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

if (chatFlag) {
  await startChatMode();
  process.exit(0);
}

const question = getQuestion();

try {
  console.log(`Using model: ${model}`);

  const response = await client.responses.create({
    model,
    instructions: getActiveInstructions(),
    input: question,
    max_output_tokens: getMaxTokens(mode)
  });

  const output = extractOutput(response);

  if (rawFlag) {
    console.log(JSON.stringify(response, null, 2));

    const rawPath = resolveSavePath(`raw-${timestampForFilename()}.json`);
    fs.writeFileSync(rawPath, JSON.stringify(response, null, 2), "utf8");
    console.log(`Raw response saved to ${rawPath}`);
  } else if (!noPrintFlag) {
    console.log(output);
  }

  if (copyFlag) {
    clipboard.writeSync(output);
    console.log("\nCopied to clipboard");
  }

  if (saveFlag) {
    const finalPath = resolveSavePath(saveFile);
    fs.writeFileSync(finalPath, output, "utf8");
    console.log(`Saved to ${finalPath}`);
  }
} catch (err) {
  console.error("Error:", err.message);
  process.exit(1);
}
