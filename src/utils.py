"""
SentinelGraph — Shared Utilities
=================================
Logging, timing, and common helpers.
"""

import time
import logging
import functools
from contextlib import contextmanager

# ── Logging Setup ────────────────────────────────────────────

import sys

def get_logger(name: str) -> logging.Logger:
    """Get a configured logger with consistent formatting."""
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = logging.Formatter(
            "%(asctime)s | %(name)-20s | %(levelname)-7s | %(message)s",
            datefmt="%H:%M:%S",
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger


# ── Timing Utilities ─────────────────────────────────────────

@contextmanager
def timer(label: str, logger: logging.Logger | None = None):
    """Context manager that logs elapsed time for a block."""
    t0 = time.perf_counter()
    yield
    elapsed = time.perf_counter() - t0
    msg = f"[{label}] completed in {elapsed:.2f}s"
    if logger:
        logger.info(msg)
    else:
        print(msg)


def timed(func):
    """Decorator that logs the runtime of the decorated function."""
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        t0 = time.perf_counter()
        result = func(*args, **kwargs)
        elapsed = time.perf_counter() - t0
        print(f"[{func.__name__}] completed in {elapsed:.2f}s")
        return result
    return wrapper


# ── Data Helpers ─────────────────────────────────────────────

def format_number(n: int | float) -> str:
    """Format large numbers with commas for display."""
    if isinstance(n, float):
        return f"{n:,.2f}"
    return f"{n:,}"


def print_separator(char: str = "-", width: int = 60):
    """Print a visual separator line."""
    print(char * width)


def print_header(title: str, width: int = 60):
    """Print a formatted section header."""
    print()
    print_separator("=", width)
    print(f"  {title}")
    print_separator("=", width)
