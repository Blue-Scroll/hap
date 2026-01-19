"""
HAP claim signing functions (for Verification Authorities)
"""

import base64
import json
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from hap.types import HAP_VERSION, EmployerCommitmentClaim, HapClaim, HumanEffortClaim

# Characters used for HAP ID generation
HAP_ID_CHARS = string.ascii_letters + string.digits


def generate_hap_id() -> str:
    """
    Generates a cryptographically secure random HAP ID.

    Returns:
        A HAP ID in the format hap_[a-zA-Z0-9]{12}
    """
    suffix = "".join(secrets.choice(HAP_ID_CHARS) for _ in range(12))
    return f"hap_{suffix}"


def generate_key_pair() -> tuple[Ed25519PrivateKey, Ed25519PublicKey]:
    """
    Generates a new Ed25519 key pair for signing HAP claims.

    Returns:
        Tuple of (private_key, public_key)
    """
    private_key = Ed25519PrivateKey.generate()
    public_key = private_key.public_key()
    return private_key, public_key


def export_public_key_jwk(public_key: Ed25519PublicKey, kid: str) -> dict[str, Any]:
    """
    Exports a public key to JWK format suitable for /.well-known/hap.json

    Args:
        public_key: The public key to export
        kid: The key ID to assign

    Returns:
        JWK dict
    """
    from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

    # Get the raw public key bytes
    raw_bytes = public_key.public_bytes(Encoding.Raw, PublicFormat.Raw)

    # Base64url encode without padding
    x = base64.urlsafe_b64encode(raw_bytes).rstrip(b"=").decode("ascii")

    return {
        "kid": kid,
        "kty": "OKP",
        "crv": "Ed25519",
        "x": x,
    }


def sign_claim(claim: HapClaim, private_key: Ed25519PrivateKey, kid: str) -> str:
    """
    Signs a HAP claim with an Ed25519 private key.

    Args:
        claim: The claim to sign
        private_key: The Ed25519 private key
        kid: Key ID to include in JWS header

    Returns:
        JWS compact serialization string
    """
    # Ensure version is set
    claim_with_version = {**claim, "v": claim.get("v", HAP_VERSION)}

    # Sign using PyJWT
    jws = jwt.encode(
        claim_with_version,
        private_key,
        algorithm="EdDSA",
        headers={"kid": kid},
    )

    return jws


def create_human_effort_claim(
    method: str,
    company: str,
    issuer: str,
    domain: Optional[str] = None,
    tier: Optional[str] = None,
    expires_in_days: Optional[int] = None,
) -> HumanEffortClaim:
    """
    Creates a complete human effort claim with all required fields.

    Args:
        method: Verification method (e.g., "physical_mail")
        company: Target company name
        issuer: VA's domain
        domain: Target company domain (optional)
        tier: Service tier (optional)
        expires_in_days: Days until expiration (optional)

    Returns:
        A complete HumanEffortClaim dict
    """
    now = datetime.now(timezone.utc)

    claim: HumanEffortClaim = {
        "v": HAP_VERSION,
        "id": generate_hap_id(),
        "type": "human_effort",
        "method": method,
        "to": {"company": company},
        "at": now.isoformat().replace("+00:00", "Z"),
        "iss": issuer,
    }

    if domain:
        claim["to"]["domain"] = domain

    if tier:
        claim["tier"] = tier

    if expires_in_days:
        exp = now + timedelta(days=expires_in_days)
        claim["exp"] = exp.isoformat().replace("+00:00", "Z")

    return claim


def create_employer_commitment_claim(
    employer_name: str,
    commitment: str,
    issuer: str,
    employer_domain: Optional[str] = None,
    expires_in_days: Optional[int] = None,
) -> EmployerCommitmentClaim:
    """
    Creates a complete employer commitment claim with all required fields.

    Args:
        employer_name: Employer's name
        commitment: Commitment level (e.g., "review_verified")
        issuer: VA's domain
        employer_domain: Employer's domain (optional)
        expires_in_days: Days until expiration (optional)

    Returns:
        A complete EmployerCommitmentClaim dict
    """
    now = datetime.now(timezone.utc)

    claim: EmployerCommitmentClaim = {
        "v": HAP_VERSION,
        "id": generate_hap_id(),
        "type": "employer_commitment",
        "employer": {"name": employer_name},
        "commitment": commitment,
        "at": now.isoformat().replace("+00:00", "Z"),
        "iss": issuer,
    }

    if employer_domain:
        claim["employer"]["domain"] = employer_domain

    if expires_in_days:
        exp = now + timedelta(days=expires_in_days)
        claim["exp"] = exp.isoformat().replace("+00:00", "Z")

    return claim
