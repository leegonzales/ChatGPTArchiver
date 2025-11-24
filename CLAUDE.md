# ChatGPTArchiver - Project Context

## Project Overview
ChatGPTArchiver is a Chrome extension that enables archiving of ChatGPT conversations in multiple formats (PDF, PNG, Markdown, JSON, HTML, Text) with both single-chat and batch export capabilities.

## Development Tools

### osgrep - Semantic Code Search
**Status:** ✅ Live and Present

osgrep is a semantic code search tool that enables intelligent code navigation using natural language queries rather than exact string matching.

- **Repository:** https://github.com/Ryandonofrio3/osgrep
- **Version:** 0.3.5
- **Status:** Server running and indexed (28 files)
- **Integration:** Claude Code automatically uses `osgrep --json` for semantic searches

#### Features
- Searches codebase using semantic meaning
- Automatic per-repository indexing
- Smart filtering (skips binaries, lockfiles, minified assets)
- Respects .gitignore and .osgrepignore
- Adaptive throttling based on system resources
- Lightweight HTTP server with live file watching (<50ms responses)
- Local-only embeddings with LanceDB

#### Usage Examples
```bash
# Semantic search
osgrep "where are exports handled"

# JSON output for tool integration
osgrep --json "authentication logic"

# Start server (already running)
osgrep --start
```

---

*Last updated: 2025-11-24*
