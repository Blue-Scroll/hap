"""
HAP (Human Attestation Protocol) type definitions for Python
"""

import re
from typing import Literal, TypedDict, Optional

# Protocol version
VERSION = "0.1"

# HAP Compact format version
COMPACT_VERSION = "1"

# HAP ID format: hap_ followed by 12 alphanumeric characters
ID_REGEX = re.compile(r"^hap_[a-zA-Z0-9]{12}$")

# Test HAP ID format: hap_test_ followed by 8 alphanumeric characters
TEST_ID_REGEX = re.compile(r"^hap_test_[a-zA-Z0-9]{8}$")

# HAP Compact format regex - 9 dot-separated fields (no type field)
COMPACT_REGEX = re.compile(r"^HAP1\.hap_[a-zA-Z0-9_]+\.[^.]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$")

# Type aliases
RevocationReason = Literal["fraud", "error", "legal", "user_request"]


class ClaimTarget(TypedDict, total=False):
    """Target recipient information"""
    name: str
    domain: str


class ClaimCost(TypedDict):
    """Monetary cost"""
    amount: int  # Smallest currency unit (cents)
    currency: str  # ISO 4217


class Claim(TypedDict, total=False):
    """
    HAP Claim - attests that a sender demonstrated costly effort to reach a recipient

    All effort dimensions (cost, time, physical, energy) are optional.
    VAs populate the dimensions they can verify.
    """
    # Required fields
    v: str
    id: str
    to: ClaimTarget
    at: str
    iss: str
    method: str
    description: str

    # Optional fields
    exp: str
    tier: str

    # Effort dimensions (all optional)
    cost: ClaimCost
    time: int  # seconds
    physical: bool
    energy: int  # kilocalories


class DecodedCompact(TypedDict):
    """Decoded compact format data"""
    claim: Claim
    signature: bytes


class CompactVerificationResult(TypedDict, total=False):
    """Result of compact format verification"""
    valid: bool
    claim: Claim
    error: str


class Jwk(TypedDict):
    """JWK public key for Ed25519"""
    kid: str
    kty: Literal["OKP"]
    crv: Literal["Ed25519"]
    x: str


class WellKnown(TypedDict):
    """Response from /.well-known/hap.json"""
    issuer: str
    keys: list[Jwk]


class VerificationResponseValid(TypedDict):
    """Successful verification response"""
    valid: Literal[True]
    id: str
    claim: Claim
    jws: str
    issuer: str
    verifyUrl: str


class VerificationResponseRevoked(TypedDict):
    """Revoked claim response"""
    valid: Literal[False]
    id: str
    revoked: Literal[True]
    revocationReason: RevocationReason
    revokedAt: str
    issuer: str


class VerificationResponseNotFound(TypedDict):
    """Not found response"""
    valid: Literal[False]
    error: Literal["not_found"]


class VerificationResponseInvalidFormat(TypedDict):
    """Invalid format response"""
    valid: Literal[False]
    error: Literal["invalid_format"]


# Union of all verification response types (use Union for Python 3.9 compatibility)
from typing import Union
VerificationResponse = Union[
    VerificationResponseValid,
    VerificationResponseRevoked,
    VerificationResponseNotFound,
    VerificationResponseInvalidFormat,
]
