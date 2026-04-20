# Changelog

All notable changes to the WorldKit VEML extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-04-12

### Added

- VEML syntax highlighting with TextMate grammar
- Real-time validation with diagnostic codes (VEML001–VEML399)
- Schema-driven autocomplete for elements and attributes
- Go to Definition and Find All References for entity IDs
- Hover documentation from VEML schema
- Scene Outline tree view with click-to-navigate
- VEML snippets for common patterns (world, entity, environment, and more)
- "New World Project" scaffolding command
- Document formatting
- "Validate All VEML" command for workspace-wide validation
- Public extension API (`VemlWorldApi` v0.1.0) for third-party extensions
- Tier-awareness status bar with capability matrix
- Automatic project detection via `.vemlproject` marker files
- Workspace trust support — syntax highlighting in untrusted workspaces, full features when trusted
