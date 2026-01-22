"""
HAP (Human Attestation Protocol) type definitions for Python
"""

import re
from typing import Literal, TypedDict, Union

# Protocol version
HAP_VERSION = "0.1"

# HAP ID format: hap_ followed by 12 alphanumeric characters
HAP_ID_REGEX = re.compile(r"^hap_[a-zA-Z0-9]{12}$")

# Type aliases
ClaimType = Literal["human_effort", "employer_commitment"]
VerificationMethod = Literal["physical_mail", "video_interview", "paid_assessment", "referral"]
CommitmentLevel = Literal["review_verified", "prioritize_verified", "respond_verified"]
RevocationReason = Literal["fraud", "error", "legal", "user_request"]


class ClaimTarget(TypedDict, total=False):
    """Target company information"""
    company: str
    domain: str


class EmployerInfo(TypedDict, total=False):
    """Employer information for employer_commitment claims"""
    name: str
    domain: str


class HumanEffortClaim(TypedDict, total=False):
    """Human effort verification claim"""
    v: str
    id: str
    type: Literal["human_effort"]
    method: str
    tier: str
    to: ClaimTarget
    at: str
    exp: str
    iss: str


class EmployerCommitmentClaim(TypedDict, total=False):
    """Employer commitment claim"""
    v: str
    id: str
    type: Literal["employer_commitment"]
    employer: EmployerInfo
    commitment: str
    at: str
    exp: str
    iss: str


# Union of all claim types
HapClaim = Union[HumanEffortClaim, EmployerCommitmentClaim]


class HapJwk(TypedDict):
    """JWK public key for Ed25519"""
    kid: str
    kty: Literal["OKP"]
    crv: Literal["Ed25519"]
    x: str


class HapWellKnown(TypedDict):
    """Response from /.well-known/hap.json"""
    issuer: str
    keys: list[HapJwk]


class VerificationResponseValid(TypedDict):
    """Successful verification response"""
    valid: Literal[True]
    id: str
    claims: HapClaim
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


# Union of all verification response types
VerificationResponse = Union[
    VerificationResponseValid,
    VerificationResponseRevoked,
    VerificationResponseNotFound,
    VerificationResponseInvalidFormat,
]
