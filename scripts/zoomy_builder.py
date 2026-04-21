#!/usr/bin/env python3
"""
zoomy_builder.py — Autonomous deliverable builder for Zoomy clients.

Usage: python3 zoomy_builder.py /path/to/client/folder

Called by zoomy_intake.py after a new Formspree submission is processed.
Builds all non-website deliverables (campaigns, chatbots, phone agents).
Sends iMessage updates to David on start and completion.
Excluded services: Custom Website, Landing Page (require human review).
"""

import sys, os, subprocess, json
from pathlib import Path
from datetime import datetime

WORKSPACE    = Path('/Users/zoomzoom/workspace')
CLAUDE_BIN   = '/opt/homebrew/bin/npx'
CLAUDE_PKG   = ['--yes', '@anthropic-ai/claude-code']
DAVID_PHONE  = '+19148749028'
MCP_CONFIG   = WORKSPACE / 'imessage-agent/mcp-config.json'
MAX_BUDGET   = '5.00'
TIMEOUT_SECS = 600   # 10 minutes

EXCLUDED_SERVICES = {'Custom Website', 'Landing Page'}

# ── iMessage helper ──────────────────────────────────────────────────────────
def imessage(text: str):
    safe   = text.replace('\\', '\\\\').replace('"', '\\"')
    script = f'tell application "Messages" to send "{safe}" to buddy "{DAVID_PHONE}" of service "SMS"'
    subprocess.run(['osascript', '-e', script], capture_output=True)

# ── System prompt for Claude Code ────────────────────────────────────────────
def make_system_prompt(folder: Path, buildable: list) -> str:
    return f"""You are the Zoomy Services autonomous production engine. A new client submitted a request via the website contact form. Build ALL deliverables to production quality with zero human involvement.

## Your context
- Client folder: {folder}
- Root workspace: {WORKSPACE}
- Use Desktop Commander MCP for ALL file reads and writes — never use Python open()

## Core rules
1. Read all brief files first before writing a single line of output
2. If a client_url is provided, scrape EVERY page of that site using WebFetch before writing anything
3. Work entirely inside the client folder (create subdirectories: campaign/, chatbot/, phone-agent/)
4. Never ask questions — make all decisions yourself, document choices in STATUS.md
5. When completely done, write STATUS.md (see format at bottom) then stop

## What NOT to build (skip if found in brief)
Custom Website and Landing Page are excluded — they need David's review first.
If these are the ONLY services requested, write STATUS.md with status: skipped and reason.

---

## CAMPAIGN FILES — if campaign-brief.md exists

Build inside a campaign/ subfolder. Read the brief first. Produce:

**CRITICAL_FACTS.md**
Business name, product/service description, key USPs (3-5), target audience (age, interests, pain points), budget range, geographic targeting, campaign objective (leads/awareness/traffic).

**SESSION_BRIEF.md**
Full campaign context: what we're selling, to whom, why they should care, competitive angle, tone of voice, any constraints or must-mentions.

**campaign_config.json**
```json
{{
  "campaign_name": "...",
  "objective": "LEAD_GENERATION",
  "daily_budget": 0,
  "targeting": {{ "age_min": 0, "age_max": 0, "interests": [], "geo": [] }},
  "placements": ["feed","story","reels"],
  "start_date": "TBD",
  "notes": "..."
}}
```

**Zoomy_Ad_Plan.md**
5 complete ad variations for EACH placement (feed, story, reels). Each variation = headline (40 chars max) + primary text (125 chars) + CTA button. Make them genuinely compelling — not generic.

**campaign_strategy.md**
- Audience segmentation (cold, warm, retargeting)
- Messaging hierarchy (awareness → interest → action)
- Creative direction (image/video recommendations)
- A/B test plan (what to split-test first)
- KPI benchmarks (expected CPM, CTR, CPL for the niche)

---

## AI CHATBOT — if chatbot-brief.md exists

**Step 1 — Knowledge extraction**
If client_url is provided: fetch every page. For each page extract: services/products with prices, hours, address, phone, email, FAQs, about/story, team, booking process. Build a comprehensive fact list.

**Step 2 — Build chatbot.js**
Full production IIFE following the website-chatbot-builder skill architecture:
- BIZ object with all contact/hours facts
- KB array with 25+ entries (greeting, thanks, every topic a visitor might ask)
- FOLLOW_UP dictionary for context-aware follow-up questions
- Gemini Flash Lite API endpoint (key placeholder: YOUR_GEMINI_KEY_HERE)
- Mobile-responsive UI with floating button, typing indicator, markdown rendering
- iOS scroll lock, 16px input font-size, visual viewport resize handler
- Color scheme based on client's industry (or site colors if scraped)

**Step 3 — Supporting files**
- embed-snippet.html — one-line install instructions + the script tag
- system-prompt.txt — the full Gemini system prompt used inside the chatbot

Save all three to chatbot/ subfolder.

---

## PHONE AGENT — if phone-agent-brief.md exists

**Step 1 — Knowledge extraction**
If client_url provided: scrape all pages and extract the same facts as chatbot.

**Step 2 — Create ElevenLabs agent via API**
Read API key: /Users/zoomzoom/workspace/secrets/elevenlabs.env (ELEVENLABS_API_KEY)

POST https://api.elevenlabs.io/v1/convai/agents
Headers: xi-api-key: <key>, Content-Type: application/json
Body:
{{
  "name": "<business> Phone Agent",
  "conversation_config": {{
    "agent": {{
      "prompt": {{ "prompt": "<full multilingual system prompt>" }},
      "first_message": "<warm opening in primary language>",
      "language": "en"
    }},
    "tts": {{
      "model_id": "eleven_multilingual_v2",
      "voice_id": "7EzWGsX10sAS4c9m9cPf"
    }},
    "asr": {{ "provider": "scribe_realtime" }},
    "turn": {{ "mode": "turn" }}
  }},
  "platform_settings": {{
    "widget": {{ "type": "phone" }},
    "built_in_tools": {{ "end_call": true, "language_detection": true }}
  }}
}}

The system prompt should:
- State the agent's name and business
- List all services/hours/pricing from the brief
- Include pronunciation rules for business name
- Include language switching rules (respond in caller's language)
- Include call ending instructions (say goodbye before triggering end_call)
- Be 300-600 words

**Step 3 — Save results**
Save to phone-agent/ subfolder:
- agent-config.json — includes agent_id from API response, voice, model, system_prompt
- system-prompt.txt — the system prompt used
- setup-notes.md — how to embed the widget, test the agent, update the knowledge

---

## STATUS.md format (write this LAST after all deliverables are done)

```
STATUS: complete
completed_at: {datetime.now().strftime('%Y-%m-%dT%H:%M:%S')}
services_built:
  - [list each service]
deliverables:
  - [relative path]: [one-line description]
notes:
  - [anything David should know: missing info, decisions made, what client needs to review]
```
"""

# ── Main build logic ─────────────────────────────────────────────────────────
def main():
    if len(sys.argv) < 2:
        print("Usage: python3 zoomy_builder.py /path/to/client/folder")
        sys.exit(1)

    folder = Path(sys.argv[1]).resolve()
    if not folder.exists():
        print(f"[builder] Folder not found: {folder}")
        sys.exit(1)

    # Load brief.json
    brief_json = folder / 'brief.json'
    if not brief_json.exists():
        print(f"[builder] No brief.json in {folder}")
        sys.exit(1)

    data     = json.loads(brief_json.read_text())
    name     = f"{data.get('first_name','').strip()} {data.get('last_name','').strip()}".strip() or 'Unknown'
    services = data.get('services', [])
    buildable = [s for s in services if s not in EXCLUDED_SERVICES]

    if not buildable:
        print(f"[builder] No auto-buildable services for {name} (services: {services}). Skipping.")
        sys.exit(0)

    # Skip if already successfully completed
    status_file = folder / 'STATUS.md'
    if status_file.exists() and 'STATUS: complete' in status_file.read_text():
        print(f"[builder] Already complete: {folder.name}")
        sys.exit(0)

    # Collect all non-website brief files
    brief_content = ""
    for bf in sorted(folder.glob('*-brief.md')):
        stem = bf.stem.lower()
        if 'website' not in stem and 'landing' not in stem:
            brief_content += f"=== {bf.name} ===\n{bf.read_text()}\n\n"

    if not brief_content:
        print(f"[builder] No buildable brief files in {folder}")
        sys.exit(0)

    # Notify David
    imessage(
        f"⚙️ Auto-build started\n"
        f"Client: {name}\n"
        f"Services: {', '.join(buildable)}\n"
        f"→ clients/{folder.name}"
    )

    print(f"[builder] Building for {name}: {buildable}")

    user_input = (
        f"Build all deliverables for client: {name}\n"
        f"Client folder: {folder}\n\n"
        f"Brief files:\n\n{brief_content}"
    )

    cmd = [
        CLAUDE_BIN, *CLAUDE_PKG, '-p',
        '--model',          'claude-sonnet-4-6',
        '--fallback-model', 'claude-haiku-4-5-20251001',
        '--system-prompt',  make_system_prompt(folder, buildable),
        '--output-format',  'text',
        '--max-budget-usd', MAX_BUDGET,
        '--dangerously-skip-permissions',
    ]
    if MCP_CONFIG.exists():
        cmd += ['--mcp-config', str(MCP_CONFIG)]

    start_time = datetime.now()
    log_path   = folder / 'build_log.txt'

    try:
        result = subprocess.run(
            cmd,
            input=user_input,
            capture_output=True,
            text=True,
            timeout=TIMEOUT_SECS,
            cwd=str(WORKSPACE)
        )

        elapsed  = int((datetime.now() - start_time).total_seconds())
        stdout   = result.stdout.strip()
        stderr   = result.stderr.strip()
        response = stdout or stderr[:300] or 'Completed (no output).'

        # Write build log
        log_path.write_text(
            f"Build completed: {datetime.now().isoformat()}\n"
            f"Duration: {elapsed}s\n"
            f"Services: {buildable}\n"
            f"Exit code: {result.returncode}\n\n"
            f"=== Claude output ===\n{response[:5000]}"
        )

        # Count deliverables
        skip_names = {'brief.json', 'build_log.txt', 'STATUS.md', 'CONFIRMED.md'}
        deliverables = [
            f for f in folder.rglob('*')
            if f.is_file()
            and f.name not in skip_names
            and not f.name.endswith('-brief.md')
        ]

        status_done = status_file.exists() and 'STATUS: complete' in status_file.read_text()

        imessage(
            f"{'✅' if status_done else '⚠️'} Build {'complete' if status_done else 'done (check STATUS)'}: {name}\n"
            f"Services: {', '.join(buildable)}\n"
            f"Files: {len(deliverables)} | Time: {elapsed}s\n"
            f"→ clients/{folder.name}"
        )
        print(f"[builder] Done: {name} — {len(deliverables)} files in {elapsed}s")

    except subprocess.TimeoutExpired:
        log_path.write_text(f"TIMEOUT after {TIMEOUT_SECS}s\nClient: {name}\n")
        imessage(f"⏱️ Build timed out (10min): {name}\nCheck clients/{folder.name} manually.")
        print(f"[builder] TIMEOUT: {name}")
        sys.exit(1)

    except Exception as e:
        log_path.write_text(f"ERROR: {e}\nClient: {name}\n")
        imessage(f"❌ Build error: {name}\n{str(e)[:120]}")
        print(f"[builder] ERROR: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()
