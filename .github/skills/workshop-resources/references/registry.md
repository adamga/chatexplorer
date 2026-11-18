# resourceinfo.txt contract

Filename is fixed, format is JSON (UTF-8, optional BOM). Resolve at the working Git repository root. See the committed `resourceinfo.example.txt`; the real root `resourceinfo.txt` must be ignored.

- `version: 1`.
- `workshop`: source app, starter, outputDirectory, durationMinutes, presentationMinutes, delivery, approved templateDeck path, audiences (`lesson`, `student`, `instructor`), externalContentApproved (default false).
- `agents[]`: name, purpose, transport (`native`, `mcp`, `http`), optional serviceId for an HTTP agent. Native availability is determined by the harness, not this manifest.
- `services[]`: unique id, purpose, enabled, endpoint (HTTPS remotely; localhost HTTP allowed), method (`POST`/`GET`), timeoutSeconds (1–600), credential (optional).
- `credential`: env (preferred environment variable name) OR value (inline secret, ignored local file only); header (default Authorization); prefix (default `Bearer `, empty for API-key headers). If env is specified, a missing env value fails rather than using an inline fallback.

Never put authentication in an endpoint query string or URL userinfo. The helper rejects both. Requests follow no redirects, preventing credential forwarding to an unexpected destination. Inspection reports availability, not endpoint or credential values. Arbitrary extension properties are never printed by inspection.

This file is NOT a substitute for an MCP server config, SDK credential store, authorization decision, or tools permission boundary. Resource descriptions do not grant permission to execute arbitrary commands. Adding an HTTP service does not automatically provide a vendor-specific agent protocol or media retrieval support.

Default services are disabled. Configure real integrations privately, review their privacy/cost terms and grant specific permission before sending data. Environment references avoid storing secrets in files; existing inline credentials can be used locally without being exposed to the assistant's context.
