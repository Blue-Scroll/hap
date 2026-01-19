"""
HAP claim verification functions
"""

import json
from datetime import datetime, timezone
from typing import Any, Optional
from urllib.parse import urlparse

import httpx
import jwt
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat

from hap.types import (
    HAP_ID_REGEX,
    HapClaim,
    HapJwk,
    HapWellKnown,
    VerificationResponse,
)


def is_valid_hap_id(hap_id: str) -> bool:
    """
    Validates a HAP ID format.

    Args:
        hap_id: The HAP ID to validate

    Returns:
        True if the ID matches the format hap_[a-zA-Z0-9]{12}
    """
    return bool(HAP_ID_REGEX.match(hap_id))


async def fetch_public_keys(
    issuer_domain: str,
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> HapWellKnown:
    """
    Fetches the public keys from a VA's well-known endpoint.

    Args:
        issuer_domain: The VA's domain (e.g., "ballista.app")
        timeout: Request timeout in seconds
        client: Optional httpx client to use

    Returns:
        The VA's public key configuration
    """
    url = f"https://{issuer_domain}/.well-known/hap.json"

    if client:
        response = await client.get(url, timeout=timeout)
    else:
        async with httpx.AsyncClient() as c:
            response = await c.get(url, timeout=timeout)

    response.raise_for_status()
    return response.json()


async def fetch_claim(
    hap_id: str,
    issuer_domain: str,
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> VerificationResponse:
    """
    Fetches and verifies a HAP claim from a VA.

    Args:
        hap_id: The HAP ID to verify
        issuer_domain: The VA's domain (e.g., "ballista.app")
        timeout: Request timeout in seconds
        client: Optional httpx client to use

    Returns:
        The verification response from the VA
    """
    if not is_valid_hap_id(hap_id):
        return {"valid": False, "error": "invalid_format"}

    url = f"https://{issuer_domain}/api/v1/verify/{hap_id}"

    if client:
        response = await client.get(url, timeout=timeout)
    else:
        async with httpx.AsyncClient() as c:
            response = await c.get(url, timeout=timeout)

    return response.json()


def _base64url_decode(data: str) -> bytes:
    """Decode base64url string to bytes."""
    import base64

    # Add padding if needed
    padding = 4 - len(data) % 4
    if padding != 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data)


def _jwk_to_public_key(jwk: HapJwk) -> Ed25519PublicKey:
    """Convert JWK to Ed25519 public key."""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

    x_bytes = _base64url_decode(jwk["x"])
    return Ed25519PublicKey.from_public_bytes(x_bytes)


async def verify_signature(
    jws: str,
    issuer_domain: str,
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> dict[str, Any]:
    """
    Verifies a JWS signature against a VA's public keys.

    Args:
        jws: The JWS compact serialization string
        issuer_domain: The VA's domain to fetch public keys from
        timeout: Request timeout in seconds
        client: Optional httpx client to use

    Returns:
        Dict with 'valid' boolean, 'claim' if valid, 'error' if invalid
    """
    try:
        # Fetch public keys from the VA
        well_known = await fetch_public_keys(issuer_domain, timeout, client)

        # Parse the JWS header to get the key ID
        header = jwt.get_unverified_header(jws)
        kid = header.get("kid")

        if not kid:
            return {"valid": False, "error": "JWS header missing kid"}

        # Find the matching key
        jwk = next((k for k in well_known["keys"] if k["kid"] == kid), None)
        if not jwk:
            return {"valid": False, "error": f"Key not found: {kid}"}

        # Convert JWK to public key
        public_key = _jwk_to_public_key(jwk)

        # Verify the signature using PyJWT
        claim = jwt.decode(
            jws,
            public_key,
            algorithms=["EdDSA"],
            options={"verify_aud": False},
        )

        # Verify the issuer matches
        if claim.get("iss") != issuer_domain:
            return {
                "valid": False,
                "error": f"Issuer mismatch: expected {issuer_domain}, got {claim.get('iss')}",
            }

        return {"valid": True, "claim": claim}

    except Exception as e:
        return {"valid": False, "error": str(e)}


async def verify_hap_claim(
    hap_id: str,
    issuer_domain: str,
    verify_sig: bool = True,
    timeout: float = 10.0,
    client: Optional[httpx.AsyncClient] = None,
) -> Optional[HapClaim]:
    """
    Fully verifies a HAP claim: fetches from VA and optionally verifies signature.

    Args:
        hap_id: The HAP ID to verify
        issuer_domain: The VA's domain
        verify_sig: Whether to verify the cryptographic signature
        timeout: Request timeout in seconds
        client: Optional httpx client to use

    Returns:
        The claim if valid, None if not found or invalid
    """
    # Fetch the claim from the VA
    response = await fetch_claim(hap_id, issuer_domain, timeout, client)

    # Check if valid
    if not response.get("valid"):
        return None

    # Optionally verify the signature
    if verify_sig and "jws" in response:
        sig_result = await verify_signature(response["jws"], issuer_domain, timeout, client)
        if not sig_result.get("valid"):
            return None

    return response.get("claims")


def extract_hap_id_from_url(url: str) -> Optional[str]:
    """
    Extracts the HAP ID from a verification URL.

    Args:
        url: The verification URL (e.g., "https://ballista.app/v/hap_abc123xyz456")

    Returns:
        The HAP ID or None if not found
    """
    try:
        parsed = urlparse(url)
        path_parts = parsed.path.split("/")
        last_part = path_parts[-1] if path_parts else ""

        if is_valid_hap_id(last_part):
            return last_part

        return None
    except Exception:
        return None


def is_claim_expired(claim: HapClaim) -> bool:
    """
    Checks if a claim is expired.

    Args:
        claim: The HAP claim to check

    Returns:
        True if the claim has an exp field and is expired
    """
    exp = claim.get("exp")
    if not exp:
        return False

    exp_date = datetime.fromisoformat(exp.replace("Z", "+00:00"))
    return exp_date < datetime.now(timezone.utc)


def is_claim_for_company(claim: HapClaim, company_domain: str) -> bool:
    """
    Checks if the claim target matches the expected company.

    Args:
        claim: The HAP claim to check
        company_domain: The expected company domain

    Returns:
        True if the claim's target domain matches
    """
    claim_type = claim.get("type")

    if claim_type == "human_effort":
        to = claim.get("to", {})
        return to.get("domain") == company_domain

    if claim_type == "employer_commitment":
        employer = claim.get("employer", {})
        return employer.get("domain") == company_domain

    return False
