"""
HAP (Human Attestation Protocol) SDK for Python

HAP is an open standard for verified human effort. It enables Verification
Authorities (VAs) to cryptographically attest that a sender took deliberate,
costly action when communicating with a recipient.

Example - Verifying a claim (for recipients):
    >>> import asyncio
    >>> from human_attestation import verify_claim, is_claim_expired
    >>>
    >>> async def main():
    ...     claim = await verify_claim("hap_abc123xyz456", "ballista.jobs")
    ...     if claim and not is_claim_expired(claim):
    ...         print(f"Verified application to {claim['to']['name']}")
    >>>
    >>> asyncio.run(main())

Example - Signing a claim (for VAs):
    >>> from human_attestation import generate_key_pair, sign_claim, create_claim
    >>>
    >>> private_key, public_key = generate_key_pair()
    >>> claim = create_claim(
    ...     method="ba_priority_mail",
    ...     description="Priority mail packet with handwritten cover letter",
    ...     recipient_name="Acme Corp",
    ...     domain="acme.com",
    ...     issuer="my-va.com",
    ...     cost={"amount": 1500, "currency": "USD"},
    ...     time=1800,
    ...     physical=True,
    ... )
    >>> jws = sign_claim(claim, private_key, kid="key_001")
"""

from human_attestation.types import (
    COMPACT_REGEX,
    COMPACT_VERSION,
    ID_REGEX,
    TEST_ID_REGEX,
    VERSION,
    ClaimCost,
    ClaimTarget,
    CompactVerificationResult,
    DecodedCompact,
    Claim,
    Jwk,
    WellKnown,
    RevocationReason,
    VerificationResponse,
)
from human_attestation.verify import (
    extract_id_from_url,
    fetch_claim,
    fetch_public_keys,
    is_claim_expired,
    is_claim_for_recipient,
    is_valid_id,
    verify_claim,
    verify_signature,
)
from human_attestation.sign import (
    create_claim,
    export_public_key_jwk,
    generate_id,
    generate_key_pair,
    generate_test_id,
    hash_content,
    is_test_id,
    sign_claim,
)
from human_attestation.compact import (
    build_compact_payload,
    decode_compact,
    encode_compact,
    extract_compact_from_url,
    generate_verification_url,
    is_valid_compact,
    sign_compact,
    verify_compact,
)

__version__ = "0.4.1"

__all__ = [
    # Version
    "__version__",
    # Constants
    "COMPACT_REGEX",
    "COMPACT_VERSION",
    "ID_REGEX",
    "TEST_ID_REGEX",
    "VERSION",
    # Types
    "ClaimCost",
    "ClaimTarget",
    "CompactVerificationResult",
    "DecodedCompact",
    "Claim",
    "Jwk",
    "WellKnown",
    "RevocationReason",
    "VerificationResponse",
    # Verification functions
    "extract_id_from_url",
    "fetch_claim",
    "fetch_public_keys",
    "is_claim_expired",
    "is_claim_for_recipient",
    "is_valid_id",
    "verify_claim",
    "verify_signature",
    # Signing functions
    "create_claim",
    "export_public_key_jwk",
    "generate_id",
    "generate_key_pair",
    "generate_test_id",
    "hash_content",
    "is_test_id",
    "sign_claim",
    # Compact format functions
    "build_compact_payload",
    "decode_compact",
    "encode_compact",
    "extract_compact_from_url",
    "generate_verification_url",
    "is_valid_compact",
    "sign_compact",
    "verify_compact",
]
