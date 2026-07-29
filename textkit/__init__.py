"""Tiny text utilities."""

import re
import unicodedata


def slugify(text: str) -> str:
    """Lowercase, strip accents, and normalize whitespaceand dashes."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text.lower())
    return text.strip("-")
