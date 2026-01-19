"""
HAP (Human Application Protocol) SDK for Python

HAP is an open standard for verified job applications. It enables Verification
Authorities (VAs) to cryptographically attest that an applicant took deliberate,
costly action when applying for a job.

Example - Verifying a claim (for employers):
    >>> import asyncio
    >>> from hap import verify_hap_claim, is_claim_expired
    >>>
    >>> async def main():
    ...     claim = await verify_hap_claim("hap_abc123xyz456", "ballista.app")
    ...     if claim and not is_claim_expired(claim):
    ...         print(f"Verified application to {claim['to']['company']}")
    >>>
    >>> asyncio.run(main())

Example - Signing a claim (for VAs):
    >>> from hap import generate_key_pair, sign_claim, create_human_effort_claim
    >>>
    >>> private_key, public_key = generate_key_pair()
    >>> claim = create_human_effort_claim(
    ...     method="physical_mail",
    ...     company="Acme Corp",
    ...     domain="acme.com",
    ...     issuer="my-va.com",
    ... )
    >>> jws = sign_claim(claim, private_key, kid="key_001")
"""

from hap.types import (
    HAP_ID_REGEX,
    HAP_VERSION,
    ClaimType,
    CommitmentLevel,
    EmployerCommitmentClaim,
    HapClaim,
    HapJwk,
    HapWellKnown,
    HumanEffortClaim,
    RevocationReason,
    VerificationMethod,
    VerificationResponse,
)
from hap.verify import (
    extract_hap_id_from_url,
    fetch_claim,
    fetch_public_keys,
    is_claim_expired,
    is_claim_for_company,
    is_valid_hap_id,
    verify_hap_claim,
    verify_signature,
)
from hap.sign import (
    create_employer_commitment_claim,
    create_human_effort_claim,
    export_public_key_jwk,
    generate_hap_id,
    generate_key_pair,
    sign_claim,
)

__version__ = "0.1.0"

__all__ = [
    # Version
    "__version__",
    # Constants
    "HAP_ID_REGEX",
    "HAP_VERSION",
    # Types
    "ClaimType",
    "CommitmentLevel",
    "EmployerCommitmentClaim",
    "HapClaim",
    "HapJwk",
    "HapWellKnown",
    "HumanEffortClaim",
    "RevocationReason",
    "VerificationMethod",
    "VerificationResponse",
    # Verification functions
    "extract_hap_id_from_url",
    "fetch_claim",
    "fetch_public_keys",
    "is_claim_expired",
    "is_claim_for_company",
    "is_valid_hap_id",
    "verify_hap_claim",
    "verify_signature",
    # Signing functions
    "create_employer_commitment_claim",
    "create_human_effort_claim",
    "export_public_key_jwk",
    "generate_hap_id",
    "generate_key_pair",
    "sign_claim",
]
