# Overview

Optimo Prompt Ai is a browser extension that helps users optimize their AI chat prompts for better results. The extension works across major AI platforms like ChatGPT, Gemini, Claude, and others by injecting optimization capabilities directly into text areas on these websites. Users can configure their preferred LLM provider (OpenAI, Anthropic, Google, or custom endpoints) with their own API keys to power the optimization functionality, with built-in daily usage limits to manage API costs.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Extension Architecture
The extension follows the standard browser extension architecture with Manifest V3:
- **Background Service Worker**: Handles core optimization logic, API calls, and storage management
- **Content Scripts**: Inject into supported AI websites to monitor text areas and provide optimization UI
- **Popup Interface**: Provides quick status overview and navigation to settings
- **Options Page**: Full-featured settings interface for API key management and optimization history

## Storage Strategy
Uses browser.storage.local for all data persistence:
- API keys stored securely in local storage (never transmitted to external servers except Google's API)
- Daily usage counters with automatic reset functionality
- Optimization history for user reference
- Prompt library for saving frequently used prompts

## Multi-LLM API Integration
Supports multiple LLM providers for prompt optimization:
- **OpenAI**: GPT-4, GPT-3.5-turbo, and other OpenAI models
- **Anthropic**: Claude 3 Sonnet, Haiku, and other Claude models
- **Google**: Gemini Pro, Gemini 2.5 Flash, and other Gemini models
- **Custom Endpoints**: Any OpenAI-compatible API endpoint
- Users provide their own API keys for cost control and privacy
- Daily usage limits (15 optimizations per day for free tier)
- Secure API key storage with local-only access
- Built-in connection testing for API validation

## Cross-Platform Compatibility
Supports multiple AI chat platforms through host permissions:
- ChatGPT (chat.openai.com)
- Google Gemini (gemini.google.com) 
- Claude (claude.ai)
- Perplexity (perplexity.ai)
- Character.ai, Poe.com, You.com
- Legacy Bard support

## UI/UX Design
Modern gradient-based design with glassmorphism effects:
- Consistent orange-to-gold gradient theme
- Responsive design for various screen sizes
- Accessibility-friendly contrast and typography
- Modal-based interfaces for complex interactions

# External Dependencies

## Core Dependencies
- **@google/genai**: Google's official Generative AI SDK for JavaScript, used for Gemini API integration
- **Browser Extension APIs**: Manifest V3 APIs for storage, scripting, activeTab permissions

## Supported Platforms
- Chrome/Chromium-based browsers (primary target)
- Firefox (through WebExtensions API compatibility)
- Edge and other browsers supporting Manifest V3

## External Services
- **OpenAI API**: GPT models for prompt optimization (platform.openai.com)
- **Anthropic API**: Claude models for prompt optimization (console.anthropic.com)
- **Google Gemini API**: Gemini models for prompt optimization (makersuite.google.com)
- **Custom API Endpoints**: Support for any OpenAI-compatible API service

## Development Tools
- Standard web technologies (HTML5, CSS3, ES6+)
- No build process or bundlers required - vanilla JavaScript implementation
- CSS custom properties for theming consistency