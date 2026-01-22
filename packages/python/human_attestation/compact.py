"""
HAP Compact Format - space-efficient serialization for QR codes

Format: HAP{version}.{id}.{method}.{to_name}.{to_domain}.{at}.{exp}.{iss}.{signature}

Example:
HAP1.hap_abc123xyz456.ba_priority_mail.Acme%20Corp.acme%2Ecom.1706169600.1769241600.ballista%2Ejobs.MEUCIQDx...

Note: Effort dimensions (cost, time, physical, energy) are NOT included in compact format.
Compact is for QR codes - minimal representation. Full claims in JWS include all dimensions.
"""

import base64
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import quote, unquote

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
from cryptography.exceptions import InvalidSignature

from human_attestation.types import (
    COMPACT_REGEX,
    COMPACT_VERSION,
    VERSION,
    Claim,
    Jwk,
    CompactVerificationResult,
    DecodedCompact,
)


def _encode_compact_field(value: str) -> str:
    """Encode a field for compact format (URL-encode + encode dots)"""
    return quote(value, safe="").replace(".", "%2E")


def _decode_compact_field(value: str) -> str:
    """Decode a compact format field"""
    return unquote(value)


def _base64url_encode(data: bytes) -> str:
    """Base64url encode without padding"""
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _base64url_decode(data: str) -> bytes:
    """Base64url decode with padding restoration"""
    padding = 4 - (len(data) % 4)
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def _iso_to_unix(iso: str) -> int:
    """Convert ISO 8601 timestamp to Unix epoch seconds"""
    dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
    return int(dt.timestamp())


def _unix_to_iso(unix: int) -> str:
    """Convert Unix epoch seconds to ISO 8601 timestamp"""
    return datetime.fromtimestamp(unix, tz=timezone.utc).isoformat().replace("+00:00", "Z")


def encode_compact(claim: Claim, signature: bytes) -> str:
    """
    Encode a HAP claim and signature into compact format.

    Args:
        claim: The HAP claim to encode
        signature: The Ed25519 signature bytes (64 bytes)

    Returns:
        Compact format string (9 fields)
    """
    to = claim.get("to", {})

    fields = [
        f"HAP{COMPACT_VERSION}",
        claim.get("id", ""),
        claim.get("method", ""),
        _encode_compact_field(to.get("name", "")),
        _encode_compact_field(to.get("domain", "")),
        str(_iso_to_unix(claim.get("at", ""))),
        str(_iso_to_unix(claim.get("exp", ""))) if claim.get("exp") else "0",
        _encode_compact_field(claim.get("iss", "")),
        _base64url_encode(signature),
    ]

    return ".".join(fields)


def decode_compact(compact: str) -> DecodedCompact:
    """
    Decode a compact format string into claim and signature.

    Args:
        compact: The compact format string

    Returns:
        DecodedCompact with claim and signature

    Raises:
        ValueError: If format is invalid
    """
    if not is_valid_compact(compact):
        raise ValueError("Invalid HAP Compact format")

    parts = compact.split(".")
    if len(parts) != 9:
        raise ValueError("Invalid HAP Compact format: expected 9 fields")

    version, hap_id, method, encoded_name, domain, at_unix, exp_unix, iss, sig_b64 = parts

    if version != f"HAP{COMPACT_VERSION}":
        raise ValueError(f"Unsupported compact version: {version}")

    name = _decode_compact_field(encoded_name)
    decoded_domain = _decode_compact_field(domain) if domain else None
    at = _unix_to_iso(int(at_unix))
    exp = _unix_to_iso(int(exp_unix)) if exp_unix != "0" else None
    signature = _base64url_decode(sig_b64)
    decoded_iss = _decode_compact_field(iss)

    # Build claim
    claim: Claim = {
        "v": VERSION,
        "id": hap_id,
        "method": method,
        "description": "",  # Not included in compact format
        "to": {"name": name, **({"domain": decoded_domain} if decoded_domain else {})},
        "at": at,
        "iss": decoded_iss,
    }

    if exp:
        claim["exp"] = exp

    return {"claim": claim, "signature": signature}


def is_valid_compact(compact: str) -> bool:
    """
    Validate if a string is a valid HAP Compact format.

    Args:
        compact: The string to validate

    Returns:
        True if valid compact format
    """
    return bool(COMPACT_REGEX.match(compact))


def build_compact_payload(claim: Claim) -> str:
    """
    Build the compact payload (everything before the signature).
    This is what gets signed.

    Args:
        claim: The HAP claim

    Returns:
        Compact payload string (8 fields)
    """
    to = claim.get("to", {})

    fields = [
        f"HAP{COMPACT_VERSION}",
        claim.get("id", ""),
        claim.get("method", ""),
        _encode_compact_field(to.get("name", "")),
        _encode_compact_field(to.get("domain", "")),
        str(_iso_to_unix(claim.get("at", ""))),
        str(_iso_to_unix(claim.get("exp", ""))) if claim.get("exp") else "0",
        _encode_compact_field(claim.get("iss", "")),
    ]

    return ".".join(fields)


def sign_compact(claim: Claim, private_key: Ed25519PrivateKey) -> str:
    """
    Sign a claim and return it in compact format.

    Args:
        claim: The HAP claim to sign
        private_key: The Ed25519 private key

    Returns:
        Signed compact format string
    """
    payload = build_compact_payload(claim)
    payload_bytes = payload.encode("utf-8")
    signature = private_key.sign(payload_bytes)
    return payload + "." + _base64url_encode(signature)


def verify_compact(compact: str, public_keys: list[Jwk]) -> CompactVerificationResult:
    """
    Verify a compact format string using provided public keys.

    Args:
        compact: The compact format string
        public_keys: Array of JWK public keys to try

    Returns:
        CompactVerificationResult
    """
    try:
        if not is_valid_compact(compact):
            return {"valid": False, "error": "Invalid compact format"}

        # Split to get payload and signature
        last_dot = compact.rfind(".")
        payload = compact[:last_dot]
        sig_b64 = compact[last_dot + 1:]
        signature = _base64url_decode(sig_b64)
        payload_bytes = payload.encode("utf-8")

        # Try each public key
        for jwk in public_keys:
            try:
                # Import public key from JWK
                x_bytes = _base64url_decode(jwk["x"])
                public_key = Ed25519PublicKey.from_public_bytes(x_bytes)

                # Verify signature
                public_key.verify(signature, payload_bytes)

                # If we get here, signature is valid
                decoded = decode_compact(compact)
                return {"valid": True, "claim": decoded["claim"]}
            except (InvalidSignature, Exception):
                continue

        return {"valid": False, "error": "Signature verification failed"}
    except Exception as e:
        return {"valid": False, "error": str(e)}


def generate_verification_url(base_url: str, compact: str) -> str:
    """
    Generate a verification URL with embedded compact claim.

    Args:
        base_url: Base verification URL (e.g., "https://ballista.jobs/v")
        compact: The compact format string

    Returns:
        URL with compact claim in query parameter
    """
    return f"{base_url}?c={quote(compact, safe='')}"


def extract_compact_from_url(url: str) -> Optional[str]:
    """
    Extract compact claim from a verification URL.

    Args:
        url: The verification URL

    Returns:
        Compact string or None if not found
    """
    try:
        from urllib.parse import urlparse, parse_qs
        parsed = urlparse(url)
        params = parse_qs(parsed.query)
        compact = params.get("c", [None])[0]
        if compact and is_valid_compact(compact):
            return compact
        return None
    except Exception:
        return None
