# WorldKit VEML

VEML language support for building virtual worlds — syntax highlighting, validation, autocomplete, and scene navigation.

<!-- TODO: Replace with actual screenshot after features are polished
![WorldKit VEML in action](assets/screenshots/overview.png)
-->

## Features

### Syntax Highlighting
Rich TextMate grammar for `.veml` files with element, attribute, and value highlighting.

<!-- TODO: screenshot: assets/screenshots/syntax-highlighting.png -->

### Real-Time Validation
Diagnostic codes (VEML001–VEML399) catch errors as you type — parse errors, schema violations, and broken references.

<!-- TODO: screenshot: assets/screenshots/validation.png -->

### Schema-Driven Autocomplete
Context-aware completions for elements, attributes, and values based on the VEML schema.

<!-- TODO: screenshot: assets/screenshots/autocomplete.png -->

### Go to Definition & Find All References
Navigate between entity references with Ctrl+Click and find all usages across your project.

### Hover Documentation
Hover over any element or attribute to see schema documentation inline.

### Scene Outline
Tree view showing your world's entity hierarchy with click-to-navigate.

<!-- TODO: screenshot: assets/screenshots/scene-outline.png -->

### Snippets
Quick-insert common VEML patterns: worlds, entities, environments, and more.

### Project Scaffolding
Run **WorldKit: New World Project** from the Command Palette to scaffold a complete VEML project.

### Document Formatting
Format your VEML files with proper indentation and structure.

### Public Extension API
Third-party extensions can query entities, resolve references, and subscribe to world changes via the `VemlWorldApi` interface (v0.1.0 — experimental).

## Getting Started

1. **Install** the extension from the VS Code Marketplace (search "WorldKit VEML").
2. **Open a folder** containing `.veml` files, or create a new project:
   - Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
   - Run **WorldKit: New World Project**
   - Choose a location and project name
3. **Start editing** — autocomplete, validation, and hover docs activate automatically.
4. **Explore your scene** — open the Scene Outline in the Explorer sidebar to see your world's structure.

> **Tip:** Create a `.vemlproject` file in your project root for automatic project detection.

## Tier Capability Matrix

WorldKit operates in tiers based on what tools are connected:

| Feature | Standalone | WorldKit Connected | WebVerse Connected |
|---------|:----------:|:------------------:|:------------------:|
| Syntax Highlighting | ✅ | ✅ | ✅ |
| Validation & Diagnostics | ✅ | ✅ | ✅ |
| Autocomplete | ✅ | ✅ | ✅ |
| Go to Definition | ✅ | ✅ | ✅ |
| Hover Documentation | ✅ | ✅ | ✅ |
| Scene Outline | ✅ | ✅ | ✅ |
| Snippets & Scaffolding | ✅ | ✅ | ✅ |
| Document Formatting | ✅ | ✅ | ✅ |
| Extension API | ✅ | ✅ | ✅ |
| Live Preview | — | 🔜 Coming soon | 🔜 Coming soon |
| WorldKit IPC | — | 🔜 Coming soon | ✅ |
| Runtime Connection | — | — | 🔜 Coming soon |

The status bar shows your current tier: `$(globe) WorldKit: Standalone`. Click it to see available capabilities.

## Requirements

- **VS Code** 1.85 or later
- No additional dependencies required

## Extension Settings

This extension does not contribute any settings currently. All features activate automatically when VEML files are detected.

## Known Issues

Report issues at the [GitHub issue tracker](https://github.com/Five-Squared-Interactive/WorldKit-VEML-VS-Code-Extension/issues).

## Release Notes

See [CHANGELOG.md](CHANGELOG.md) for version history.

---

**WorldKit VEML** is developed by [FiveSquared](https://github.com/five-squared).
