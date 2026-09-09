# TaskWish document extractor

A focused TaskWish example that accepts document uploads and converts them to
Markdown with [Firecrawl Anydoc](https://github.com/firecrawl/anydoc),
and returns one combined Markdown document.

## Run

```sh
bun install
cp .env.example .env
bun start
```

Open the Console URL printed at startup, select `Documents.readDocuments`, and
upload documents totaling up to 10 MB. Word, PowerPoint, Excel, OpenDocument,
RTF, EPUB, CSV, and PDF formats are supported.

Scanned PDFs require hosted OCR. Set `ANYDOC_OCR=hosted` and provide a
`FIRECRAWL_API_KEY` to opt in. Text PDFs are processed locally by default.

With Node.js 20+, use `npm install` and `npm run start:node` instead. Run
`bun run check` and `bun test` to verify the example.
