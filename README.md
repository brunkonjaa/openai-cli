
```
# OpenAI CLI

A practical Node.js command-line tool for interacting with OpenAI models directly from the terminal.

---

## Features

- Prompt input from command line
- Response modes: short / medium / long
- Copy output to clipboard
- Save output to file (auto timestamp or custom name)
- Read prompt from file
- Override model per run
- Custom system instructions
- Raw JSON response output and saving
- Silent mode (--no-print)
- Automatic outputs/ directory handling

---

## Usage

### Basic
```

ai "What is DNS tunneling?"

```

### Modes
```

ai "What is DNS tunneling?" short
ai "What is DNS tunneling?" medium
ai "What is DNS tunneling?" long

```

### Copy output
```

ai "What is DNS tunneling?" --copy

```

### Save output
```

ai "What is DNS tunneling?" --save
ai "What is DNS tunneling?" --save notes.txt

```

### Copy + save
```

ai "What is DNS tunneling?" --copy --save

```

### Custom model
```

ai "What is DNS tunneling?" --model gpt-4.1

```

### Custom instruction
```

ai "Explain DNS tunneling" --system "Answer like an NFQ Level 8 lecturer"

```

### Prompt from file
```

ai --file prompt.txt

```

### Raw response
```

ai "Explain DNS tunneling" --raw

```

### Silent mode
```

ai "Explain DNS tunneling" --no-print --save

```

### Help
```

ai --help

```

---

## Response Modes

- short → one short sentence  
- medium → 2–3 clear sentences  
- long → detailed paragraphs  

---

## Setup

Install dependencies:
```

npm install

```

Create a `.env` file:
```

OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4.1-mini

```

IMPORTANT:
Never commit your `.env` file.  
Ensure `.env` is listed in `.gitignore`.

Run locally:
```

node --env-file=.env index.js "test message"

```

Install globally:
```

npm link

```

Then use:
```

ai "test message"

```

---

## Output Folder

All saved files are written to:
```

outputs/

```

Examples:
```

outputs/output-2026-04-01-21-35-10.txt
outputs/notes.txt
outputs/raw-2026-04-01-21-35-10.json

```

---

## Tech Stack

- Node.js
- OpenAI Responses API
- Clipboardy

---

## Purpose

Built for:
- fast terminal workflows
- automation of AI-assisted tasks
- practical API usage
- developer productivity

---

Created by Bruno Suric
```
