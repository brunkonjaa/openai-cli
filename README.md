# OpenAI CLI Assistant
> A fast, developer-focused CLI tool for interacting with OpenAI directly from your terminal.

## Demo

- Run directly from terminal:
  ai "Explain DNS tunneling" short

- Output:
  DNS tunneling is a technique that encodes data inside DNS queries to bypass network restrictions.

- Using flags:
  ai "Explain DNS tunneling" --copy
  - Copies output to clipboard

## Example Output

- Screenshot location:
  ./assets/demo.png

- To generate screenshot:
  - Run:
    ai "Explain DNS tunneling" short
    ai "Summarise HTTP vs HTTPS" medium
  - Take a screenshot
  - Save it as:
    /assets/demo.png

## Why This Project Matters

- Demonstrates:
  - Building a real CLI tool using Node.js
  - Integration with OpenAI API
  - Environment-based configuration (.env)
  - Secure handling of API keys
  - Feature design (flags, clipboard, file input)
  - Clean Git workflow and version control

- Real-world relevance:
  - Reflects modern developer workflows
  - Shows practical use of AI for productivity and automation
  - Demonstrates ability to build usable developer tools

## 🏷GitHub Topics

- cli
- nodejs
- openai
- productivity
- developer-tools
- automation