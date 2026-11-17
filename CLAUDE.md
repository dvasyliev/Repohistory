# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Repohistory is a Next.js web application that provides an open-source dashboard for tracking GitHub repository traffic history beyond the default 14-day limit. The application integrates with GitHub OAuth and Supabase for authentication and data persistence.

## Package Manager

This project uses npm as the package manager.

## Key Components Structure

- `app/(dashboard)/` - Protected dashboard pages
- `app/components/charts/` - Chart components using D3 and Recharts
- `app/components/repo/` - Repository-related UI components
- `app/components/ui/` - Shadcn/ui components (button, card, tooltip, etc.)
- `lib/supabase/` - Supabase client utilities
- `lib/octokit/` - GitHub API integration

## UI Components

This project uses shadcn/ui components. If you need a component that's not currently installed, you can ask the user to install it using command like: `npx shadcn@latest add label`.

## Code Style Guidelines

When coding, only write comments when the code is extremely difficult to understand by just reading the code. Only add comments in cases where the logic is genuinely complex or non-obvious. Otherwise, write plain code without comments (following clean code methodology).

Never use the `any` type in TypeScript. Always use proper type definitions, interfaces, or union types to maintain type safety.
