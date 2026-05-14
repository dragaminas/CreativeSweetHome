"""Utility helpers for OpenClaw Studio."""

from __future__ import annotations

import re


def camel_to_snake(name: str) -> str:
    """Convert a *camelCase* string to *snake_case*.

    Handles consecutive uppercase letters (e.g. ``XMLParser`` → ``xml_parser``)
    and leaves already-snake_case identifiers unchanged.
    """
    # Insert underscore between a run of uppercase letters followed by lowercase
    # and the preceding lowercase letter or digit.
    s = re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', name)
    # Insert underscore between consecutive uppercase letters and the next
    # uppercase + lowercase sequence (handles XMLParser → XML_Parser).
    s = re.sub(r'([A-Z]+)([A-Z][a-z])', r'\1_\2', s)
    return s.lower()


def snake_to_camel(name: str) -> str:
    """Convert a *snake_case* string to *camelCase*.

    Consecutive underscores are collapsed (e.g. ``foo__bar`` → ``fooBar``).
    Already-camelCase identifiers are returned unchanged.
    """
    if not name:
        return ''
    parts = name.split('_')
    return parts[0] + ''.join(p.capitalize() for p in parts[1:] if p)
