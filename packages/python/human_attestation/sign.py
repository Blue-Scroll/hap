"""
HAP claim signing functions (for Verification Authorities)
"""

import base64
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import (
    Ed25519PrivateKey,
    Ed25519PublicKey,
)

from human_attestation.types import (
    VERSION,
    Claim,
    ClaimCost,
)

# Characters used for ID generation
ID_CHARS = string.ascii_letters + string.digits


def generate_id() -> str:
    """
    Generates a cryptographically secure random HAP ID.

    Returns:
        A HAP ID in the format hap_[a-zA-Z0-9]{12}
    """
    suffix = "".join(secrets.choice(ID_CHARS) for _ in range(12))
    return f"hap_{suffix}"


def generate_test_id() -> str:
    """
    Generates a test HAP ID (for previews and development).

    Returns:
        A test HAP ID in the format hap_test_[a-zA-Z0-9]{8}
    """
    suffix = "".join(secrets.choice(ID_CHARS) for _ in range(8))
    return f"hap_test_{suffix}"


def is_test_id(hap_id: str) -> bool:
    """
    Checks if a HAP ID is a test ID.

    Args:
        hap_id: The HAP ID to check

    Returns:
        True if the ID is a test ID
    """
    import re
    return bool(re.match(r"^hap_test_[a-zA-Z0-9]{8}$", hap_id))


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


def sign_claim(claim: Claim, private_key: Ed25519PrivateKey, kid: str) -> str:
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
    claim_with_version = {**claim, "v": claim.get("v", VERSION)}

    # Sign using PyJWT
    jws = jwt.encode(
        claim_with_version,
        private_key,
        algorithm="EdDSA",
        headers={"kid": kid},
    )

    return jws


def create_claim(
    method: str,
    description: str,
    recipient_name: str,
    issuer: str,
    domain: Optional[str] = None,
    tier: Optional[str] = None,
    expires_in_days: Optional[int] = None,
    cost: Optional[ClaimCost] = None,
    time: Optional[int] = None,
    physical: Optional[bool] = None,
    energy: Optional[int] = None,
) -> Claim:
    """
    Creates a complete HAP claim with all required fields.

    Args:
        method: VA-specific verification method identifier
        description: Human-readable description of the effort
        recipient_name: Recipient name
        issuer: VA's domain
        domain: Recipient domain (optional)
        tier: Service tier (optional)
        expires_in_days: Days until expiration (optional)
        cost: Monetary cost incurred (optional)
        time: Time in seconds of exclusive dedication (optional)
        physical: Whether physical-world atoms were involved (optional)
        energy: Human energy expenditure in kilocalories (optional)

    Returns:
        A complete Claim dict
    """
    now = datetime.now(timezone.utc)

    claim: Claim = {
        "v": VERSION,
        "id": generate_id(),
        "to": {"name": recipient_name},
        "at": now.isoformat().replace("+00:00", "Z"),
        "iss": issuer,
        "method": method,
        "description": description,
    }

    if domain:
        claim["to"]["domain"] = domain

    if tier:
        claim["tier"] = tier

    if expires_in_days:
        exp = now + timedelta(days=expires_in_days)
        claim["exp"] = exp.isoformat().replace("+00:00", "Z")

    # Add effort dimensions if provided
    if cost:
        claim["cost"] = cost

    if time is not None:
        claim["time"] = time

    if physical is not None:
        claim["physical"] = physical

    if energy is not None:
        claim["energy"] = energy

    return claim


def hash_content(content: str) -> str:
    """
    Computes SHA-256 hash of content with prefix.

    Args:
        content: The content to hash

    Returns:
        Hash string in format "sha256:xxxxx"
    """
    import hashlib
    hash_bytes = hashlib.sha256(content.encode("utf-8")).hexdigest()
    return f"sha256:{hash_bytes}"
