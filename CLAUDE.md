# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

shortORDER is a web application designed to assist in creating automation and shortcut functionality for iOS and other Apple devices (i.e., generating Apple Shortcuts-style workflows).

## Current State

This repository is greenfield: it contains only the README and the GPL-3.0 license. No application code, package manifest, build system, test framework, or CI has been established yet.

Because of this:

- There are no build, lint, or test commands to run yet.
- When the tech stack is chosen and scaffolded, update this file in the same PR with the actual commands (install, dev server, build, lint, full test run, and single-test invocation) and a short architecture overview.

## License Constraint

The project is licensed under GPL-3.0. Any code or dependencies added must be compatible with GPL-3.0 — do not vendor or copy in code under GPL-incompatible licenses.

## Conventions

- Development happens on feature branches; `main` is the default branch.
- Keep this file accurate as the codebase grows: document only commands and architecture that actually exist, and prune anything that becomes stale.
