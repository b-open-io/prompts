---
name: publish-request
description: Use this skill when preparing to publish a package, plugin, or skill and you need human approval first. Invoked when the user says "publish", "release", "ship", or "push to registry" but no approved Linear ticket exists yet. Runs preflight checks, creates or updates a Linear ticket with a structured release plan, moves it to Ready for Review, then stops — it does NOT execute the publish command.
disable-model-invocation: true
metadata:
  author: b-open-io
  version: "1.0.0"
---

# Publish Request

Prepare a release for human review in Linear. This skill ends before the publish command runs. The agent resumes only after a human moves the ticket to "Approved" in Linear.

## When to Use

Use this skill when the publish-gate hook blocks a publish command with "No Linear ticket in Approved state." This skill prepares the approval request. It does not publish anything.

## Prerequisites

- Linear MCP server configured (`claude mcp add --transport http linear-server https://mcp.linear.app/mcp`)
- `LINEAR_API_KEY` set in environment (for the hook to verify approval later)

## Workflow

### Step 1: Preflight Checks

Before touching Linear, verify the release is ready:

