from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, List, Optional


@dataclass
class ValidationResult:
    ok: bool
    errors: List[str]


@dataclass
class ParseValidationResult:
    ok: bool
    value: Optional[Dict[str, Any]]
    errors: List[str]


@dataclass
class DowngradeResult:
    card: Dict[str, Any]
    warnings: List[str]


@dataclass
class DiffEntry:
    path: str
    change_type: str
    before: Any = None
    after: Any = None


@dataclass
class MergeOptions:
    array: str = "replace"
    conflict: str = "incoming"


@dataclass
class MergeResult:
    value: Any
    conflicts: List[str]


@dataclass
class AssetReference:
    path: str
    kind: str
    value: Any


@dataclass
class LintResult:
    ok: bool
    warnings: List[str]
