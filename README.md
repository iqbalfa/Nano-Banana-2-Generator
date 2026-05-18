# 🍌 Nano Banana 2 Generator

A web UI for Google's **Gemini Nano Banana** image generation API. Generate and edit images using Nano Banana 2 (`gemini-3.1-flash-image-preview`) and Nano Banana Pro (`gemini-3-pro-image-preview`).

🔥 **Live Demo**: https://iqbalfa.github.io/Nano-Banana-2-Generator/

## Features

- 🎨 **Full parameter control** — output format, temperature, aspect ratio, resolution, thinking level
- 🔍 **Grounding with Google Search** — generate images based on real-time web data
- 🖼️ **Image Search** — use web images as visual context (Nano Banana 2)
- 🧠 **Thinking levels** — Minimal, Low, Medium, High
- 💬 **Chat-style interface** conversational multi-turn image generation

## How to Use

1. **Get a Gemini API key** from [Google AI Studio](https://aistudio.google.com/)
2. Enter your API key in the sidebar and click **Save**
3. Adjust parameters as needed
4. Type a prompt and click Generate (or press Enter)
5. View the generated images and text response

## Parameters

| Parameter | Values |
|-----------|--------|
| **Model** | Nano Banana 2 / Nano Banana Pro |
| **Output format** | Images & text / Images only |
| **Temperature** | 0.0 – 2.0 (default: 1.0) |
| **Aspect ratio** | Auto, 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9 |
| **Resolution** | 512, 1K, 2K, 4K |
| **Thinking level** | Minimal, Low, Medium, High |
| **Top P** | 0.0 – 1.0 (default: 0.95) |
| **Output length** | Max output tokens (default: 65536) |

## API Reference

Built on top of the [Gemini API generateContent](https://ai.google.dev/gemini-api/docs/image-generation) endpoint. Uses the `gemini-3.1-flash-image-preview` and `gemini-3-pro-image-preview` models.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- GitHub Pages
- Gemini API (client-side)

## Development

```bash
npm install
npm run dev
npm run build
```

## License

MIT
