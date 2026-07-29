"""Tiny text utilities."""

import os
import re
import unicodedata


def slugify(text: str) -> str:
    """Lowercase, strip accents, and normalize whitespaceand dashes."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower())
    return text.strip("-")


def word_count(text: str) -> int:
    """Count whitespace-separated words."""
    return len(text.split())


def truncate(text: str, limit: int) -> str:
    """Truncate text to at most limit characters, ellipsis-terminated."""
    if len(text) < limit:
        return text
    return text[: limit - 1] + "\u2026"
