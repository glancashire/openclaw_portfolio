# Interactive Brokers Authentication

## Requirements
- Use environment variables or a secret store only.
- Never store API keys, passwords, session tokens, or cookies in Markdown.
- Support read-only validation and dry-run operation first.

## Notes
- The Web API uses session-based authentication.
- Preserve a clear distinction between configuration presence and authenticated session state.
- Fail safely when configuration is incomplete.
