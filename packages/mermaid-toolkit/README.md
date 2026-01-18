# @rtkelly/mermaid-toolkit

A comprehensive TypeScript toolkit for Mermaid diagrams featuring programmatic theme customization and ASCII rendering. Perfect for blogs, documentation sites, and applications that need consistent diagram theming or text-based alternatives.

## Features

### 🎨 Theme Engine

- **6 Professional Presets** - Retro-brutalist, terminal, high-contrast, pastel, dark, and default themes
- **Type-Safe API** - Full TypeScript coverage for all 50+ Mermaid theme variables
- **Dual Output Modes** - Generate `mermaid.initialize()` code or inject `%%{init:...}%%` directives
- **Complete Customization** - Override colors, fonts, spacing, and diagram-specific settings
- **Zero Dependencies** - Pure TypeScript implementation

### 📐 ASCII Renderer

- **Beautiful ASCII Art** - Convert flowcharts to Unicode/ASCII box-drawing characters
- **Configurable Layout** - Adjust spacing, padding, and character sets
- **LLM-Friendly** - Perfect for llms.txt generation and accessibility
- **Terminal Ready** - Display diagrams in logs, terminals, or plain text

## Installation

```bash
npm install @rtkelly/mermaid-toolkit mermaid
# or
pnpm add @rtkelly/mermaid-toolkit mermaid
# or
yarn add @rtkelly/mermaid-toolkit mermaid
```

> **Note:** Requires `mermaid` as a peer dependency for diagram parsing and rendering.

---

## Theme Engine

### Quick Start

```typescript
import { ThemeEngine } from "@rtkelly/mermaid-toolkit";

// Use a preset
const engine = new ThemeEngine({ preset: "retro-brutalist" });

// Generate initialization code
console.log(engine.generateInitCode());
// → mermaid.initialize({ theme: "base", themeVariables: {...}, ... })

// Or inject theme into diagram
const themedDiagram = engine.applyTheme(`
graph LR
  A --> B
`);
// → %%{init: {"theme":"base",...}}%%\ngraph LR\n  A --> B
```

### Available Presets

| Preset                | Description                       | Colors                    | Font          |
| --------------------- | --------------------------------- | ------------------------- | ------------- |
| **`retro-brutalist`** | Green-on-black terminal aesthetic | #00ff00, #33ff33, #000000 | Monospace     |
| **`terminal`**        | Classic IBM terminal look         | #00ff41 on #0a0a0a        | IBM Plex Mono |
| **`high-contrast`**   | Accessibility-focused             | Black/white, 18px         | Sans-serif    |
| **`pastel`**          | Soft modern colors                | #ffc0cb, #b0e0e6, #98fb98 | Segoe UI      |
| **`dark`**            | Mermaid's dark theme              | Dark palette              | Trebuchet MS  |
| **`default`**         | Mermaid's default theme           | Standard palette          | Trebuchet MS  |

### Custom Themes

```typescript
import { ThemeEngine } from "@rtkelly/mermaid-toolkit";

// Start with preset and override
const engine = new ThemeEngine({
  preset: "retro-brutalist",
  customVariables: {
    primaryColor: "#ff0080", // Hot pink primary
    fontFamily: "Comic Sans MS", // Yes, really
    fontSize: "20px",
  },
  customConfig: {
    flowchart: {
      curve: "basis", // Curved arrows
      padding: 20,
    },
  },
});

// Or create from scratch
const customEngine = ThemeEngine.custom({
  theme: "base",
  themeVariables: {
    primaryColor: "#ff6b35",
    secondaryColor: "#004e89",
    background: "#f7f7f7",
    fontFamily: '"Fira Code", monospace',
  },
});
```

### API Reference

#### `ThemeEngine`

```typescript
class ThemeEngine {
  constructor(options: ThemeEngineOptions);

  // Getters
  getConfig(): MermaidConfig;

  // Setters
  setThemeVariable(key: keyof MermaidThemeVariables, value: string): void;
  setFlowchartConfig(config: Partial<FlowchartConfig>): void;
  setSequenceConfig(config: Partial<SequenceConfig>): void;
  // ... other diagram-specific setters

  // Output generation
  generateInitCode(): string;
  generateTheme(): GeneratedTheme;
  applyTheme(mermaidCode: string): string;

  // Static factory methods
  static fromPreset(name: ThemePreset): ThemeEngine;
  static custom(config: Partial<MermaidConfig>): ThemeEngine;
}
```

#### Helper Functions

```typescript
// One-liner theme application
import { applyThemeToMermaid } from "@rtkelly/mermaid-toolkit";

const themed = applyThemeToMermaid(diagramCode, { preset: "terminal" });

// Config generation without class instance
import { generateMermaidConfig } from "@rtkelly/mermaid-toolkit";

const config = generateMermaidConfig({ preset: "dark" });
```

#### Theme Variables (50+ available)

```typescript
interface MermaidThemeVariables {
  // Base colors
  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;

  // Backgrounds
  background?: string;
  mainBkg?: string;
  secondBkg?: string;

  // Typography
  fontFamily?: string;
  fontSize?: string;

  // Borders and lines
  primaryBorderColor?: string;
  lineColor?: string;

  // Diagram-specific (50+ more)
  actorBkg?: string;
  nodeBorder?: string;
  signalColor?: string;
  // ... see theme-types.ts for complete list
}
```

### Real-World Examples

#### Blog with Consistent Theming

```typescript
import { ThemeEngine } from "@rtkelly/mermaid-toolkit";
import mermaid from "mermaid";

// Initialize once with your brand colors
const engine = new ThemeEngine({
  preset: "retro-brutalist",
  customVariables: {
    primaryColor: "#00ff00", // Your brand green
    fontFamily: '"JetBrains Mono", monospace',
  },
});

mermaid.initialize(engine.getConfig());

// All diagrams now use your theme
```

#### Dynamic Theme Switching

```typescript
const themes = {
  light: new ThemeEngine({ preset: "default" }),
  dark: new ThemeEngine({ preset: "dark" }),
  terminal: new ThemeEngine({ preset: "retro-brutalist" }),
};

function switchTheme(themeName: "light" | "dark" | "terminal") {
  mermaid.initialize(themes[themeName].getConfig());
  mermaid.contentLoaded(); // Re-render diagrams
}
```

#### Per-Diagram Theming

```typescript
const engine = new ThemeEngine({ preset: "pastel" });

const diagramWithTheme = engine.applyTheme(`
graph TD
  Start --> Process
  Process --> End
`);

// Render with injected theme directive
document.querySelector(".mermaid").textContent = diagramWithTheme;
```

---

## ASCII Renderer

### Quick Start

```typescript
import { mermaidToAscii } from "@rtkelly/mermaid-toolkit";

const diagram = `
graph LR
  A[Start] --> B[Process]
  B --> C[End]
`;

const ascii = mermaidToAscii(diagram);
console.log(ascii);
```

**Output:**

```
┌─────────┐     ┌─────────┐     ┌─────┐
│  Start  ├────►│ Process ├────►│ End │
└─────────┘     └─────────┘     └─────┘
```

### Options

```typescript
interface AsciiOptions {
  paddingX?: number; // Horizontal spacing (default: 5)
  paddingY?: number; // Vertical spacing (default: 5)
  borderPadding?: number; // Text padding inside boxes (default: 1)
  asciiOnly?: boolean; // Use +--| instead of ┌──┐ (default: false)
  showCoords?: boolean; // Debug: show grid coordinates (default: false)
}

// Example
const ascii = mermaidToAscii(diagram, {
  paddingX: 10,
  borderPadding: 2,
  asciiOnly: true, // Use +, -, |, > instead of Unicode
});
```

**ASCII-only output:**

```
+---------+     +---------+     +-----+
|  Start  |---->| Process |---->| End |
+---------+     +---------+     +-----+
```

### Supported Diagram Types

| Type              | Status       | Example           |
| ----------------- | ------------ | ----------------- |
| Flowchart (LR/RL) | ✅ Supported | `graph LR`        |
| Flowchart (TD/BT) | ✅ Supported | `graph TD`        |
| Sequence Diagram  | 🚧 Planned   | `sequenceDiagram` |
| Class Diagram     | ⏳ Future    | `classDiagram`    |
| ER Diagram        | ⏳ Future    | `erDiagram`       |
| State Diagram     | ⏳ Future    | `stateDiagram`    |

---

## Combined Usage

Use both features together for maximum flexibility:

```typescript
import { ThemeEngine, mermaidToAscii } from "@rtkelly/mermaid-toolkit";

// Create themed SVG version
const engine = new ThemeEngine({ preset: "retro-brutalist" });
const themedDiagram = engine.applyTheme(diagramCode);

// Create ASCII version for llms.txt
const asciiVersion = mermaidToAscii(diagramCode, { asciiOnly: true });

// Save both
fs.writeFileSync("diagram.mmd", themedDiagram);
fs.writeFileSync("diagram.txt", asciiVersion);
```

---

## Use Cases

### 1. Documentation Sites with Consistent Branding

Apply your brand colors and fonts to all diagrams:

```typescript
const brandTheme = new ThemeEngine({
  preset: "default",
  customVariables: {
    primaryColor: "#your-brand-color",
    fontFamily: '"Your Brand Font", sans-serif',
  },
});

mermaid.initialize(brandTheme.getConfig());
```

### 2. llms.txt Generation

Convert visual diagrams to LLM-friendly text:

````typescript
import { mermaidToAscii } from "@rtkelly/mermaid-toolkit";
import fs from "fs";

const mdxContent = fs.readFileSync("blog-post.mdx", "utf-8");
const llmFriendly = mdxContent.replace(
  /```mermaid\n([\s\S]*?)```/g,
  (match, code) => {
    const ascii = mermaidToAscii(code, { asciiOnly: true });
    return `\`\`\`\n${ascii}\n\`\`\``;
  },
);

fs.writeFileSync("llms.txt", llmFriendly);
````

### 3. Dark Mode Support

Automatically switch diagram themes based on user preference:

```typescript
const lightTheme = new ThemeEngine({ preset: "default" });
const darkTheme = new ThemeEngine({ preset: "dark" });

function applyTheme(isDark: boolean) {
  const engine = isDark ? darkTheme : lightTheme;
  mermaid.initialize(engine.getConfig());
  mermaid.contentLoaded();
}

// Listen for theme changes
window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", (e) => {
    applyTheme(e.matches);
  });
```

### 4. Terminal Documentation

Display diagrams in terminals, CI logs, or README files:

```typescript
console.log(mermaidToAscii(flowchart, { asciiOnly: true }));
```

### 5. Accessibility

Provide text-based alternatives for screen readers:

```typescript
const visualDiagram = themedDiagram;
const textAlternative = mermaidToAscii(diagramCode);

document.querySelector(".diagram").innerHTML = `
  ${visualDiagram}
  <details>
    <summary>Text version</summary>
    <pre>${textAlternative}</pre>
  </details>
`;
```

---

## Development

```bash
# Install dependencies
pnpm install

# Build the package
pnpm build

# Run manual tests
pnpm exec tsx tests/theme-test.ts      # Test theme engine
pnpm exec tsx tests/manual-test.ts     # Test ASCII renderer

# Run test suite (when available)
pnpm test
```

---

## Package Structure

```
packages/mermaid-toolkit/
├── src/
│   ├── index.ts              # Main exports
│   ├── theme-engine.ts       # Theme engine core
│   ├── theme-types.ts        # TypeScript types
│   ├── theme-presets.ts      # Built-in themes
│   ├── parser.ts             # Mermaid parser wrapper
│   ├── grid.ts               # ASCII layout engine
│   ├── types.ts              # ASCII types
│   ├── constants.ts          # Box-drawing chars
│   └── renderers/
│       └── flowchart.ts      # Flowchart ASCII renderer
└── tests/
    ├── theme-test.ts         # Theme engine tests
    ├── manual-test.ts        # ASCII renderer tests
    └── fixtures/             # 18+ test diagrams
```

---

## Architecture

### Theme Engine

1. **Preset-First Design** - Start with professionally designed themes
2. **Override System** - Customize only what you need
3. **Type Safety** - Full TypeScript coverage prevents errors
4. **Dual Output** - Generate init code OR inject directives

```typescript
ThemeEngineOptions → ThemeEngine → MermaidConfig → Output
                                    ↓
                          generateInitCode() or applyTheme()
```

### ASCII Renderer

1. **Parse** - Use Mermaid's parser to understand syntax
2. **Layout** - Convert to internal grid representation
3. **Render** - Generate ASCII/Unicode box-drawing art

```typescript
Mermaid Code → Parser → Grid Layout → ASCII Renderer → Text Art
```

---

## Roadmap

### v1.0 (Current)

- [x] Theme engine with 6 presets
- [x] Full theme variable coverage (50+)
- [x] Flowchart ASCII renderer (LR/TD)
- [x] TypeScript types

### v1.1 (Planned)

- [ ] Sequence diagram ASCII renderer
- [ ] Comprehensive test suite (vitest)
- [ ] 1000+ example diagram collection
- [ ] Theme gallery documentation

### v2.0 (Future)

- [ ] Class diagram ASCII renderer
- [ ] State diagram ASCII renderer
- [ ] Custom renderer API
- [ ] Theme builder UI

---

## Contributing

Contributions welcome! This package is part of [Ryan Kelly's blog](https://github.com/rtkelly13/blog).

See [AGENTS.md](../../AGENTS.md) in the root repository for development workflow.

---

## Credits

**Theme Engine:**

- Inspired by Mermaid.js theming system
- Built on research from official docs and real-world implementations

**ASCII Renderer:**

- Inspired by [mermaid-ascii](https://github.com/AlexanderGrooff/mermaid-ascii) (Go)
- Uses [mermaid](https://mermaid.js.org/) for parsing

---

## License

MIT © Ryan Kelly

---

## Examples

### Retro-Brutalist Theme (Terminal Aesthetic)

```typescript
const engine = new ThemeEngine({ preset: "retro-brutalist" });
// Generates: #00ff00 on black, monospace, sharp corners
```

### High-Contrast Theme (Accessibility)

```typescript
const engine = new ThemeEngine({ preset: "high-contrast" });
// Generates: Black/white, 18px font, clear borders
```

### Custom Corporate Theme

```typescript
const corporate = new ThemeEngine({
  preset: "default",
  customVariables: {
    primaryColor: "#003366", // Navy
    secondaryColor: "#66b3ff", // Light blue
    tertiaryColor: "#ffcc00", // Gold
    fontFamily: '"Helvetica Neue", sans-serif',
    fontSize: "16px",
    background: "#ffffff",
    lineColor: "#003366",
  },
  customConfig: {
    flowchart: {
      curve: "basis",
      padding: 15,
    },
  },
});

console.log(corporate.generateInitCode());
```

**Output:**

```javascript
mermaid.initialize({
  theme: "base",
  themeVariables: {
    primaryColor: "#003366",
    secondaryColor: "#66b3ff",
    tertiaryColor: "#ffcc00",
    fontFamily: '"Helvetica Neue", sans-serif',
    fontSize: "16px",
    background: "#ffffff",
    lineColor: "#003366",
    // ... 40+ more variables
  },
  flowchart: {
    curve: "basis",
    padding: 15,
  },
});
```

---

**Made with ❤️ for developers who care about design consistency and accessibility.**
