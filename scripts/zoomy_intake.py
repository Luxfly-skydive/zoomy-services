#!/usr/bin/env python3
"""
zoomy_intake.py — Zoomy Services client intake automation

Two email types handled:
  1. Formspree (noreply@formspree.io) → new client → create briefs → PREVIEW build (1 page)
  2. Non-Formspree from known client email → writes CONFIRMED.md → triggers FULL SITE build

Campaign files and phone agents are always built in full regardless of confirmation status.
"""

import imaplib, email, html, json, re, subprocess, sys
from datetime import datetime
from pathlib import Path

# ── Config ──────────────────────────────────────────────────────────────────
GMAIL           = "contact@zoomy.services"
APP_PW          = "mzgooyeesnvficrw"
IMAP_HOST       = "imap.gmail.com"
CLIENTS_DIR     = Path("/Users/zoomzoom/workspace/clients")
PROCESSED_FILE  = CLIENTS_DIR / "processed_emails.json"
DEBUG_DIR       = CLIENTS_DIR / "_debug_emails"
FORMSPREE_FROM  = "noreply@formspree.io"
BUILDER_SCRIPT  = Path("/Users/zoomzoom/workspace/zoomy_builder.py")
EXCLUDED_SVCS   = {"Custom Website", "Landing Page"}

CLIENTS_DIR.mkdir(parents=True, exist_ok=True)
DEBUG_DIR.mkdir(parents=True, exist_ok=True)

# ── Load / save processed IDs ────────────────────────────────────────────────
def load_processed():
    if PROCESSED_FILE.exists():
        return set(json.loads(PROCESSED_FILE.read_text()).get("processed_ids", []))
    return set()

def save_processed(ids):
    PROCESSED_FILE.write_text(json.dumps({"processed_ids": list(ids)}, indent=2))

# ── Parse Formspree plain-text body ─────────────────────────────────────────
def parse_formspree_body(body: str, email_id: str) -> dict:
    """
    Actual Formspree format:
        field_name:
        value

        next_field:
        value
    Field name is on its own line ending with colon.
    Value is on the next non-empty line(s).
    """
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    (DEBUG_DIR / f"email_{email_id}_{ts}.txt").write_text(body, encoding="utf-8")

    known = {"first_name", "last_name", "email", "company", "service", "message"}
    data = {}
    lines = body.replace('\r\n', '\n').splitlines()
    i = 0

    while i < len(lines):
        line = lines[i].strip()
        if line.endswith(':') and line[:-1].lower() in known:
            field = line[:-1].lower()
            i += 1
            value_lines = []
            while i < len(lines):
                next_line = lines[i].strip()
                # Stop at next field or footer
                if (next_line.endswith(':') and next_line[:-1].lower() in known) \
                        or next_line.startswith('Submitted') \
                        or next_line.startswith('---'):
                    break
                if next_line:
                    value_lines.append(html.unescape(next_line))
                i += 1
            data[field] = '\n'.join(value_lines).strip()
        else:
            i += 1

    # service → list (comma-separated from multiple checkboxes)
    if 'service' in data and data['service']:
        data['services'] = [s.strip() for s in data['service'].split(',') if s.strip()]
    else:
        data['services'] = []

    # Fallback: infer service from message text if no checkboxes were ticked
    if not data['services']:
        msg_lower = (data.get('message', '') + ' ' + data.get('company', '')).lower()
        inferred = []
        if any(w in msg_lower for w in ['chatbot', 'chat bot', 'chat widget', 'ai chat']):
            inferred.append('AI Chatbot')
        if any(w in msg_lower for w in ['campaign', 'meta ads', 'facebook ads', 'google ads', 'tiktok ads', 'paid ads', 'ad campaign']):
            inferred.append('Campaign Files')
        if any(w in msg_lower for w in ['phone agent', 'voice agent', 'phone ai', 'call agent', 'ai receptionist', 'answering']):
            inferred.append('Phone AI Agent')
        if any(w in msg_lower for w in ['landing page', 'landing']):
            inferred.append('Landing Page')
        if any(w in msg_lower for w in ['website', 'web site', 'site', 'webpage']):
            inferred.append('Custom Website')
        if inferred:
            data['services'] = inferred
            print(f"[parse] Services inferred from message: {inferred}")

    # Extract URL from company field or message for website scraping
    company_val = data.get('company', '')
    message_val = data.get('message', '')
    url_match = re.search(r'https?://[^\s]+', company_val + ' ' + message_val)
    data['client_url'] = url_match.group(0).rstrip('.,)') if url_match else ''

    print(f"[parse] Fields: {[k for k in data if k not in ('services','client_url')]}")
    print(f"[parse] Services: {data['services']}")
    print(f"[parse] Client URL: {data['client_url'] or 'none'}")
    return data

# ── Map known client emails → folder (for confirmation matching) ─────────────
def load_client_email_map() -> dict:
    """Returns {client_email_lower: Path(folder)} for all existing brief.json files."""
    mapping = {}
    for folder in CLIENTS_DIR.iterdir():
        if not folder.is_dir():
            continue
        brief_file = folder / "brief.json"
        if brief_file.exists():
            try:
                brief = json.loads(brief_file.read_text())
                if brief.get("email"):
                    mapping[brief["email"].strip().lower()] = folder
            except Exception:
                pass
    return mapping

# ── Create client folder ─────────────────────────────────────────────────────
def make_client_folder(data: dict) -> Path:
    date_str  = datetime.now().strftime("%Y-%m-%d")
    first     = re.sub(r"[^a-zA-Z0-9]", "", data.get("first_name", ""))
    last      = re.sub(r"[^a-zA-Z0-9]", "", data.get("last_name", ""))
    slug      = (first + last) or "Unknown"
    folder    = CLIENTS_DIR / f"{date_str}_{slug}"
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "brief.json").write_text(
        json.dumps({**data, "received_at": datetime.now().isoformat()}, indent=2)
    )
    return folder

# ── iMessage David ───────────────────────────────────────────────────────────
def imessage(text: str):
    import subprocess
    safe   = text.replace('\\', '\\\\').replace('"', '\\"')
    script = f'tell application "Messages" to send "{safe}" to buddy "+19148749028" of service "SMS"'
    subprocess.run(["osascript", "-e", script], capture_output=True)

# ── Write brief files ────────────────────────────────────────────────────────
def route(data: dict, folder: Path):
    services     = data.get("services", [])
    name         = f"{data.get('first_name','').strip()} {data.get('last_name','').strip()}".strip() or "Unknown"
    client_email = data.get("email", "")
    company      = data.get("company", "")
    message      = data.get("message", "")
    client_url   = data.get("client_url", "")
    svc_str      = ", ".join(services) or "Not specified"
    parts        = []

    has_website  = any(s in services for s in ["Custom Website", "Landing Page"])
    has_campaign = "Campaign Files" in services
    has_chatbot  = "AI Chatbot" in services
    has_phone    = "Phone AI Agent" in services

    base = (
        f"**Client:** {name} <{client_email}>\n"
        f"**Company/URL:** {company}\n"
        f"**Client URL:** {client_url or 'Not provided'}\n"
        f"**Services:** {svc_str}\n\n"
        f"## Project Description\n{message}\n"
    )

    if has_website:
        (folder / "website-brief.md").write_text(
            f"# Website Brief — {name}\n\n{base}\n"
            f"## Build Instructions\n"
            f"Build a complete production-ready website.\n"
            f"If client_url is provided, scrape every page before writing a single word.\n"
        )
        parts.append("🌐 Website")

    if has_campaign:
        (folder / "campaign-brief.md").write_text(
            f"# Campaign Brief — {name}\n\n{base}\n"
            f"## Build Instructions\n"
            f"Create full campaign strategy + 5 ad copy variations. Files only — no Meta deployment.\n"
        )
        parts.append("📣 Campaign")

    if has_chatbot:
        (folder / "chatbot-brief.md").write_text(
            f"# Chatbot Brief — {name}\n\n{base}\n"
            f"## Build Instructions\n"
            f"Build Gemini-powered chatbot. If client_url provided, scrape fully before writing system prompt.\n"
        )
        parts.append("🤖 Chatbot")

    if has_phone:
        (folder / "phone-agent-brief.md").write_text(
            f"# Phone Agent Brief — {name}\n\n{base}\n"
            f"## Build Instructions\n"
            f"Create ElevenLabs agent via API. Voice: 7EzWGsX10sAS4c9m9cPf.\n"
            f"If client_url provided, scrape fully before writing system prompt.\n"
        )
        parts.append("📞 Phone Agent")

    if not parts:
        (folder / "inquiry-brief.md").write_text(
            f"# Inquiry — {name}\n\n{base}\nNo recognised service. Review manually.\n"
        )
        parts.append("📋 Inquiry")

    msg = (
        f"🟢 New Zoomy client: {name}"
        + (f" ({company})" if company else "")
        + f"\nServices: {svc_str}"
        + (f"\nURL: {client_url}" if client_url else "")
        + f"\n→ {' | '.join(parts)}"
        + f"\n→ workspace/clients/{folder.name}"
    )
    imessage(msg)
    print(f"[route] {name} — {svc_str} → {folder.name}")

# ── Spawn autonomous builder for non-website services ────────────────────────
def spawn_builder(folder: Path, data: dict):
    """Fire zoomy_builder.py in the background for campaign / chatbot / phone agent work."""
    services  = data.get("services", [])
    buildable = [s for s in services if s not in EXCLUDED_SVCS]
    if not buildable:
        print(f"[intake] No auto-buildable services — skipping builder for {folder.name}")
        return
    if not BUILDER_SCRIPT.exists():
        print(f"[intake] zoomy_builder.py not found at {BUILDER_SCRIPT}")
        return
    log_path = folder / "builder_stdout.log"
    log_f    = open(str(log_path), "w")
    subprocess.Popen(
        [sys.executable, str(BUILDER_SCRIPT), str(folder)],
        stdout=log_f,
        stderr=subprocess.STDOUT,
        cwd=str(Path("/Users/zoomzoom/workspace"))
    )
    print(f"[intake] Builder spawned: {folder.name} → {buildable}")

# ── Main ─────────────────────────────────────────────────────────────────────
def main():
    processed = load_processed()

    print(f"[imap] Connecting...")
    mail = imaplib.IMAP4_SSL(IMAP_HOST, 993)
    mail.login(GMAIL, APP_PW)
    mail.select("INBOX")
    print(f"[imap] Connected: {GMAIL}")

    _, msgs = mail.search(None, 'UNSEEN')
    all_unseen = [mid.decode() for mid in msgs[0].split() if msgs[0]]

    # Separate Formspree submissions from confirmation emails
    formspree_ids = []
    other_emails = []  # (mid, from_hdr)
    for mid in all_unseen:
        _, hdr = mail.fetch(mid.encode(), '(BODY.PEEK[HEADER.FIELDS (FROM)])')
        from_hdr = hdr[0][1].decode('utf-8', errors='ignore')
        if FORMSPREE_FROM in from_hdr:
            formspree_ids.append(mid)
        else:
            other_emails.append((mid, from_hdr))

    # ── 1. Process Formspree submissions (new clients → preview build) ────────
    new_formspree = [mid for mid in formspree_ids if mid not in processed]
    print(f"[imap] Unread Formspree: {len(new_formspree)}")

    for mid in new_formspree:
        processed.add(mid)
        save_processed(processed)

        _, raw = mail.fetch(mid.encode(), '(BODY.PEEK[])')
        msg = email.message_from_bytes(raw[0][1])

        body = ""
        if msg.is_multipart():
            for part in msg.walk():
                if part.get_content_type() == "text/plain":
                    body = part.get_payload(decode=True).decode("utf-8", errors="ignore")
                    break
        else:
            body = msg.get_payload(decode=True).decode("utf-8", errors="ignore")

        form_data = parse_formspree_body(body, mid)

        if not form_data.get("email") and not form_data.get("first_name"):
            print(f"[skip] Email {mid} parsed empty — see _debug_emails/")
            mail.store(mid.encode(), "+FLAGS", "\\Seen")
            continue

        folder = make_client_folder(form_data)
        route(form_data, folder)
        spawn_builder(folder, form_data)
        mail.store(mid.encode(), "+FLAGS", "\\Seen")

    # ── 2. Process confirmation emails (known client → full site trigger) ─────
    new_other = [(mid, fh) for mid, fh in other_emails if mid not in processed]
    if new_other:
        client_map = load_client_email_map()
        print(f"[imap] Unread non-Formspree: {len(new_other)}")
        for mid, from_hdr in new_other:
            processed.add(mid)
            save_processed(processed)
            mail.store(mid.encode(), "+FLAGS", "\\Seen")

            matched = None
            for client_email, folder in client_map.items():
                if client_email in from_hdr.lower():
                    matched = folder
                    break

            if matched:
                confirmed_file = matched / "CONFIRMED.md"
                if not confirmed_file.exists():
                    confirmed_file.write_text(
                        f"# Full Build Confirmed\n"
                        f"confirmed_at: {datetime.now().isoformat()}\n"
                        f"source: email from client\n"
                    )
                    print(f"[confirm] Full build unlocked: {matched.name}")
                    imessage(f"✅ Full site confirmed: {matched.name}\n→ Full multi-page build fires next run")
                else:
                    print(f"[confirm] Already confirmed: {matched.name}")
            else:
                print(f"[non-formspree] No matching client for: {from_hdr.strip()}")

    mail.logout()
    total = len(new_formspree)
    if total == 0 and not new_other:
        print("No new submissions.")
        return
    print(f"Done — {total} Formspree submission(s) processed.")

if __name__ == "__main__":
    main()
