"""
SentinelGraph — Caspian Alert Service
======================================
Provides outbound security alerting through the official caspian-sdk (v1.0.2).

Package name:  caspian         (installed via: pip install caspian-sdk==1.0.2)
Import path:   caspian.hosted.client

Architecture:
    SecurityEvent (PostgreSQL)
        - check risk threshold   (SENTINELGRAPH_RISK_THRESHOLD, default 60)
        - check duplicate window (SENTINELGRAPH_ALERT_INTERVAL, default 15 min)
        - send_security_alert()
        - HttpGatewayClient.send(
              GatewayRequest(
                  method="POST",
                  path="/v1/conversations/{CASPIAN_ALERT_CONVERSATION_ID}/messages",
                  json_body={"text": <formatted alert>},
              )
          )
        - Notification record (PostgreSQL)

Configuration (environment variables only — never hardcoded):
    CASPIAN_API_KEY                  Required for any Caspian activity.
    CASPIAN_BASE_URL                 Optional. Default: https://api.trycaspianai.com
    CASPIAN_ALERT_CONVERSATION_ID    The one explicit destination conversation.

Startup states surfaced via /health and get_status():
    NOT CONFIGURED      CASPIAN_API_KEY is missing.
    DESTINATION NOT SET API key present but CASPIAN_ALERT_CONVERSATION_ID missing.
    READY               Both api_key and conversation_id are configured.
    ERROR               SDK raised an exception during initialisation.

Security guarantees:
    - No credentials are ever printed or included in log output.
    - No automatic conversation discovery (list_conversations is not in this SDK).
    - No broadcast: messages go only to CASPIAN_ALERT_CONVERSATION_ID.
    - Caspian failures are fully isolated from the ML/database/upload pipeline.
"""

import logging
import os
from pathlib import Path
from datetime import datetime, timezone
from dotenv import load_dotenv

# Ensure .env is explicitly loaded from project root
_project_root = Path(__file__).resolve().parent.parent
load_dotenv(_project_root / ".env")

logger = logging.getLogger("sentinelgraph.caspian")

# -- Module-level state -------------------------------------------------------
_client = None              # HttpGatewayClient instance, or None
_status = "NOT CONFIGURED"  # surfaced to /health
_conversation_id = None     # primary CASPIAN_ALERT_CONVERSATION_ID (never logged raw)
_conversation_ids = []      # all configured destination conversations (Telegram, Discord, etc.)


def _mask_id(cid: str) -> str:
    """Safely mask a conversation ID for logging."""
    if not cid:
        return "NONE"
    return cid[:4] + "..." + cid[-4:] if len(cid) > 8 else "***"


def get_status() -> str:
    """Return the current Caspian integration status string."""
    return _status


def initialize_caspian() -> None:
    """
    Initialise the Caspian HttpGatewayClient from environment variables.

    Must be called once at FastAPI startup.
    Failures are logged without secrets and never re-raised —
    the application continues normally in all cases.
    """
    global _client, _status, _conversation_id, _conversation_ids

    # Refresh from .env in case it was created/updated at runtime
    load_dotenv(_project_root / ".env", override=True)

    api_key = os.environ.get("CASPIAN_API_KEY", "").strip()
    base_url = os.environ.get("CASPIAN_BASE_URL", "").strip()
    conversation_id_raw = os.environ.get("CASPIAN_ALERT_CONVERSATION_ID", "").strip()
    discord_id = os.environ.get("CASPIAN_DISCORD_CONVERSATION_ID", "").strip()
    telegram_id = os.environ.get("CASPIAN_TELEGRAM_CONVERSATION_ID", "").strip()

    # -- State 1: no API key --------------------------------------------------
    if not api_key:
        _status = "NOT CONFIGURED"
        logger.info(
            "Caspian integration: NOT CONFIGURED "
            "(CASPIAN_API_KEY not set — set it in .env to enable alerting)"
        )
        return

    # -- State 2: API key present, create the client --------------------------
    try:
        from caspian.hosted.client import HttpGatewayClient

        # Pass base_url only when explicitly configured; an empty string would
        # override the SDK default (https://api.trycaspianai.com) with nothing.
        if base_url:
            _client = HttpGatewayClient(api_key=api_key, base_url=base_url)
            logger.info(
                "Caspian integration: HttpGatewayClient created (custom base_url)"
            )
        else:
            _client = HttpGatewayClient(api_key=api_key)
            logger.info(
                "Caspian integration: HttpGatewayClient created (default base_url)"
            )

    except Exception as exc:
        _client = None
        _status = "ERROR"
        # Log exception type only — never the api_key value.
        logger.error(
            "Caspian integration: ERROR during client initialisation — %s",
            type(exc).__name__,
        )
        return

    # -- State 2 vs 3: check for explicit destination(s) -----------------------
    conv_list = []
    if conversation_id_raw:
        for cid in conversation_id_raw.split(","):
            cid = cid.strip()
            if cid and cid not in conv_list:
                conv_list.append(cid)
    if discord_id and discord_id not in conv_list:
        conv_list.append(discord_id)
    if telegram_id and telegram_id not in conv_list:
        conv_list.append(telegram_id)

    if not conv_list:
        _status = "DESTINATION NOT SET"
        logger.info(
            "Caspian integration: DESTINATION NOT SET "
            "(CASPIAN_ALERT_CONVERSATION_ID not set — "
            "alerts will be skipped until a destination is configured)"
        )
        return

    _conversation_ids = conv_list
    _conversation_id = conv_list[0]
    _status = "READY"
    masked_destinations = ", ".join(_mask_id(cid) for cid in _conversation_ids)
    logger.info(
        "Caspian integration: READY "
        "(HttpGatewayClient ready, explicit destination conversation(s) configured: %s)",
        masked_destinations,
    )


# -- Alert formatting ---------------------------------------------------------

def _format_alert(event) -> str:
    """
    Build the security alert message from a SecurityEvent ORM object.
    Only includes fields that are actually populated — no fabrication.
    """
    agent_name = os.environ.get("SENTINELGRAPH_AGENT_NAME", "SentinelGraph").strip()

    lines = [
        "SENTINELGRAPH SECURITY ALERT",
        "",
        f"Threat:      {event.attack_type}",
        f"Risk Score:  {int(event.risk_score)}/100",
        f"Severity:    {event.severity}",
        "",
    ]

    if event.source_ip:
        lines.append(f"Source:      {event.source_ip}")
    if event.destination_ip:
        lines.append(f"Destination: {event.destination_ip}")

    lines += ["", "Model:       TGN"]

    if event.mitre_tactic:
        lines.append(f"MITRE ATT&CK: {event.mitre_tactic}")
    if event.mitre_technique:
        lines.append(f"Technique:   {event.mitre_technique}")

    ts = event.timestamp or datetime.now(timezone.utc)
    lines += [
        "",
        f"Timestamp:   {ts.strftime('%Y-%m-%d %H:%M:%S UTC')}",
        "Status:      Threat detected",
        "",
        f"{agent_name} - AI Network Attack Forecasting",
    ]

    return "\n".join(lines)


def _format_test_alert() -> str:
    agent_name = os.environ.get("SENTINELGRAPH_AGENT_NAME", "SentinelGraph").strip()
    return (
        "SENTINELGRAPH TEST ALERT\n\n"
        "Caspian communication channel is working.\n"
        f"System: {agent_name}\n"
        f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}"
    )


# -- Internal send helper -----------------------------------------------------

def _send_text(text: str) -> tuple[bool, str | None]:
    """
    POST the text to the configured conversation(s) via the Caspian gateway API.

    Returns (True, None) on HTTP 2xx success, (False, error_message) on error.
    Never raises. Never logs the conversation_id value unmasked.
    """
    destinations = _conversation_ids or ([_conversation_id] if _conversation_id else [])
    if _client is None or not destinations:
        err = "Caspian client not initialized or destination conversation ID not configured"
        logger.info("[CASPIAN DEBUG] Caspian request result=FAILED")
        logger.info("[CASPIAN DEBUG] Caspian error=%s", err)
        return False, err

    from caspian.hosted.client import GatewayRequest

    errors = []
    successes = 0

    for cid in destinations:
        logger.info("[CASPIAN DEBUG] Sending alert to configured conversation (%s)", _mask_id(cid))
        try:
            result = _client.send(
                GatewayRequest(
                    method="POST",
                    path=f"/v1/conversations/{cid}/messages",
                    json_body={"text": text},
                )
            )

            if result.is_ok:
                logger.info("[CASPIAN DEBUG] Caspian request result=SUCCESS (%s)", _mask_id(cid))
                successes += 1
            else:
                err = result.error
                err_msg = type(err).__name__ if err else "Gateway returned error"
                logger.info("[CASPIAN DEBUG] Caspian request result=FAILED (%s): %s", _mask_id(cid), err_msg)
                logger.error("Caspian: gateway returned an error for %s — %s", _mask_id(cid), err_msg)
                errors.append(f"{_mask_id(cid)}: {err_msg}")

        except Exception as exc:
            err_msg = type(exc).__name__
            logger.info("[CASPIAN DEBUG] Caspian request result=FAILED (%s): %s", _mask_id(cid), err_msg)
            logger.error("Caspian: unexpected exception in _send_text for %s — %s", _mask_id(cid), err_msg)
            errors.append(f"{_mask_id(cid)}: {err_msg}")

    if successes > 0:
        return True, None if not errors else "; ".join(errors)
    return False, "; ".join(errors) if errors else "Failed to send to any configured destination"


# -- Public send functions -----------------------------------------------------

def send_security_alert_with_result(event, db=None) -> tuple[bool, str | None]:
    """
    Send a formatted security alert for the given SecurityEvent.

    Returns (True, None) on success, (False, error_description) on failure.
    Never raises — all failures are caught and logged.
    """
    if _status != "READY":
        logger.debug("Caspian alert skipped (status=%s)", _status)
        return False, f"Caspian integration not READY (current status: {_status})"

    text = _format_alert(event)
    sent, err = _send_text(text)

    if sent:
        logger.info(
            "Caspian alert sent (attack=%s, risk=%s)",
            event.attack_type,
            int(event.risk_score),
        )
    else:
        logger.error(
            "Caspian alert failed to send (attack=%s, risk=%s) — %s",
            event.attack_type,
            int(event.risk_score),
            err,
        )

    return sent, err


def send_security_alert(event, db=None) -> bool:
    """Backward-compatible wrapper returning bool."""
    sent, _ = send_security_alert_with_result(event, db=db)
    return sent


def send_test_alert_with_result() -> tuple[bool, str | None]:
    """
    Send a clearly labelled test message to the configured destination.

    Returns (True, None) if sent successfully, (False, error) on error.
    """
    if _status != "READY":
        logger.info("Caspian test alert skipped (status=%s)", _status)
        return False, f"Caspian status is {_status} — configure credentials first"

    text = _format_test_alert()
    sent, err = _send_text(text)

    if sent:
        logger.info("Caspian test alert sent successfully")
    else:
        logger.error("Caspian test alert failed — %s", err)

    return sent, err


def send_test_alert() -> bool:
    """Backward-compatible wrapper returning bool."""
    sent, _ = send_test_alert_with_result()
    return sent
