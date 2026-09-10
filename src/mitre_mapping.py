"""
SentinelGraph — MITRE ATT&CK Stage Mapping
============================================
Fixed lookup that maps CIC-IDS-2018 attack categories to high-level
ATT&CK tactics for the demo UI.

DESIGN DECISION (document for judges):
- DoS/DDoS → "Impact" (TA0040) — the correct ATT&CK tactic for service
  disruption. This is distinct from Exfiltration (TA0010).
- Infiltration → "Lateral Movement" — dataset's Infiltration scenarios
  involve internal NMAP probing + data transfer between victim hosts.
- BruteForce/WebAttack → "Initial Access" — password guessing and
  XSS/SQLi are means of gaining an initial foothold.
- Bot → "Command & Control" — botnet traffic is definitionally C2.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import (
    CATEGORY_TO_MITRE,
    MITRE_STAGE_COLORS,
    MITRE_STAGE_RISK,
    ID_TO_CATEGORY,
)


def get_mitre_stage(attack_category: str) -> str:
    """
    Map an attack category to its MITRE ATT&CK stage.

    Parameters
    ----------
    attack_category : str
        One of: Benign, BruteForce, DoS, DDoS, WebAttack, Bot, Infiltration

    Returns
    -------
    str
        The corresponding ATT&CK tactic name.
    """
    return CATEGORY_TO_MITRE.get(attack_category, "Unknown")


def get_mitre_color(stage: str) -> str:
    """Get the hex color code for a MITRE stage badge."""
    return MITRE_STAGE_COLORS.get(stage, "#6b7280")  # gray fallback


def get_risk_score(stage: str) -> float:
    """Get the 0-1 risk score for a MITRE stage."""
    return MITRE_STAGE_RISK.get(stage, 0.0)


def get_stage_from_label_id(label_id: int) -> str:
    """Map a numeric label ID → attack category → MITRE stage."""
    category = ID_TO_CATEGORY.get(label_id, "Unknown")
    return get_mitre_stage(category)


def get_stage_badge_html(stage: str) -> str:
    """Generate an HTML badge for the Streamlit UI."""
    color = get_mitre_color(stage)
    return (
        f'<span style="background-color:{color}; color:white; '
        f'padding:4px 12px; border-radius:12px; font-weight:600; '
        f'font-size:14px;">{stage}</span>'
    )


def explain_mapping() -> str:
    """
    Return a human-readable explanation of the mapping for the demo.
    Useful for the architecture doc and the UI explanation panel.
    """
    lines = [
        "MITRE ATT&CK Stage Mapping (CIC-IDS-2018 -> ATT&CK Tactics)",
        "=" * 60,
        "",
        f"{'Attack Category':<20} {'ATT&CK Stage':<25} {'Risk Level':<10}",
        "-" * 60,
    ]
    for category, stage in CATEGORY_TO_MITRE.items():
        risk = MITRE_STAGE_RISK.get(stage, 0.0)
        risk_bar = "#" * int(risk * 10) + "." * (10 - int(risk * 10))
        lines.append(f"{category:<20} {stage:<25} {risk_bar} {risk:.1f}")
    lines.extend([
        "",
        "Design notes:",
        "* DoS/DDoS -> Impact (TA0040): correct ATT&CK tactic for disruption",
        "* Infiltration -> Lateral Movement: internal probing + data transfer",
        "* Bot -> C2: botnet traffic is definitionally command-and-control",
    ])
    return "\n".join(lines)


if __name__ == "__main__":
    print(explain_mapping())
