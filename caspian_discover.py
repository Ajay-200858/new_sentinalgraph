"""
SentinelGraph — Caspian Diagnostic Script
==========================================
Reads CASPIAN_API_KEY from the environment (or .env file), then uses
the official caspian-sdk 1.0.2 API to show you:

  - Your active connections (channel, id, status, address)
  - The available channels supported by your account
  - Customers/contacts known to your account

This is READ-ONLY. It does not send any messages, create any resources,
or modify anything.

Run:
    venv\\Scripts\\python.exe caspian_discover.py

The API key is read from the environment — it is never printed.
Conversation IDs are printed because they are the information you need
(they are not secret credentials).
"""

import os
import sys


# ── Load .env if present ──────────────────────────────────────────────────────
def _load_dotenv() -> None:
    """Minimal .env loader — only for local diagnostics."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if not os.path.exists(env_path):
        return
    with open(env_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip('"').strip("'")
            if key and key not in os.environ:
                os.environ[key] = value


_load_dotenv()

api_key = os.environ.get("CASPIAN_API_KEY", "").strip()
base_url = os.environ.get("CASPIAN_BASE_URL", "").strip()

if not api_key:
    print("ERROR: CASPIAN_API_KEY is not set.")
    print("Add it to your .env file, then re-run this script.")
    sys.exit(1)

print("CASPIAN_API_KEY: found (not displayed)")
print()

# ── Create the client ─────────────────────────────────────────────────────────
try:
    from caspian.hosted.client import HttpGatewayClient, GatewayRequest
    from caspian.hosted.provisioning import HostedProvisioning
    from caspian.hosted.directory import HostedDirectory
except ImportError as e:
    print(f"ERROR: caspian package not importable — {e}")
    print("Run: venv\\Scripts\\pip install caspian-sdk==1.0.2")
    sys.exit(1)

if base_url:
    client = HttpGatewayClient(api_key=api_key, base_url=base_url)
    print(f"Using base_url: {base_url}")
else:
    client = HttpGatewayClient(api_key=api_key)
    print("Using default base_url: https://api.trycaspianai.com")

print()

prov = HostedProvisioning(client)
directory = HostedDirectory(client)

# ── 1. Connections (channels you have set up) ─────────────────────────────────
print("=" * 60)
print("CONNECTIONS  (GET /v1/connections)")
print("=" * 60)
result = prov.list_connections()
if not result.is_ok:
    print(f"  Error: {type(result.error).__name__} — {result.error}")
else:
    connections = result.value
    if not connections:
        print("  No connections found.")
        print()
        print("  You need to connect at least one channel (Telegram, Discord,")
        print("  Slack, etc.) in the Caspian dashboard before you can get a")
        print("  conversation ID.")
    else:
        for conn in connections:
            if isinstance(conn, dict):
                print(f"  id:      {conn.get('id', 'N/A')}")
                print(f"  channel: {conn.get('channel', 'N/A')}")
                print(f"  status:  {conn.get('status', 'N/A')}")
                print(f"  address: {conn.get('address', 'N/A')}")
                print()

# ── 2. Available channels ────────────────────────────────────────────────────
print("=" * 60)
print("AVAILABLE CHANNELS  (GET /v1/channels)")
print("=" * 60)
result = prov.list_channels()
if not result.is_ok:
    print(f"  Error: {type(result.error).__name__} — {result.error}")
else:
    channels_obj = result.value
    channels = getattr(channels_obj, "channels", [])
    if not channels:
        print("  (none returned)")
    else:
        for ch in channels:
            if isinstance(ch, dict):
                print(f"  - {ch.get('name', ch)}")
            else:
                print(f"  - {ch}")
print()

# ── 3. Customers/contacts ─────────────────────────────────────────────────────
print("=" * 60)
print("CUSTOMERS / CONTACTS  (GET /v1/customers)")
print("=" * 60)
result = directory.customers()
if not result.is_ok:
    print(f"  Error: {type(result.error).__name__} — {result.error}")
else:
    customers = result.value
    if not customers:
        print("  No customers found.")
        print()
        print("  Customers appear here after they first message your bot.")
        print("  Their 'id' field IS a conversation ID you can use.")
    else:
        for c in customers:
            print(f"  id:      {c.id}")
            print(f"  handle:  {c.handle}")
            print(f"  channel: {c.channel}")
            print()

# ── 4. Recent events (to see any existing conversation IDs in the wild) ───────
print("=" * 60)
print("RECENT EVENTS  (GET /v1/events?limit=10)")
print("(conversation_id fields only — no message content)")
print("=" * 60)
result = client.send(
    GatewayRequest(
        method="GET",
        path="/v1/events",
        params={"limit": "10"},
    )
)
if not result.is_ok:
    print(f"  Error: {type(result.error).__name__} — {result.error}")
else:
    events = result.value.json_list
    if not events:
        print("  No recent events found.")
    else:
        seen_convs = {}
        for ev in events:
            if not isinstance(ev, dict):
                continue
            data = ev.get("data", {}) or {}
            msg = data.get("message", {}) or {}
            conv_id = msg.get("conversation_id", "")
            channel = msg.get("channel", "")
            direction = msg.get("direction", "")
            if conv_id and conv_id not in seen_convs:
                seen_convs[conv_id] = (channel, direction)
        if seen_convs:
            print("  Conversation IDs seen in recent events:")
            for conv_id, (channel, direction) in seen_convs.items():
                print(f"    conversation_id: {conv_id}  channel={channel}  direction={direction}")
        else:
            print("  No conversation_id fields found in recent events.")
print()

# ── Summary ───────────────────────────────────────────────────────────────────
print("=" * 60)
print("NEXT STEP")
print("=" * 60)
print("""
To get your CASPIAN_ALERT_CONVERSATION_ID:

OPTION A — From an existing conversation (recommended):
  1. Open your connected channel (Telegram/Discord/Slack).
  2. Send any message to your Caspian bot.
  3. Re-run this script — the conversation_id will appear under
     CUSTOMERS or RECENT EVENTS above.
  4. Copy that ID into your .env:
       CASPIAN_ALERT_CONVERSATION_ID=<id from above>

OPTION B — From the Caspian dashboard:
  1. Go to https://app.trycaspianai.com
  2. Open your project > Conversations (or Contacts/Customers).
  3. Click any conversation — the ID is in the URL or the detail panel.
  4. Copy it into your .env.

OPTION C — Use the Initiate API (for bot-first outbound):
  This sends the very first message FROM your bot TO a known contact.
  The conversation_id for initiate is the contact's identifier on the
  platform (e.g. a Telegram chat_id or Discord user_id), not a Caspian
  conversation UUID. Use this only if the Caspian docs for your
  channel explicitly support it.

  Relevant SDK method:
      prov.initiate(connection_id=<conn_id>, conversation=<platform_id>, text=<msg>)
      POST /v1/connections/{connection_id}/initiate

NOTE: The conversation_id is NOT a secret. You can safely paste it into
      your .env file. Only CASPIAN_API_KEY must be kept private.
""")
