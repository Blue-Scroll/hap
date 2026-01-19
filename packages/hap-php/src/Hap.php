<?php

declare(strict_types=1);

namespace BlueScroll\Hap;

/**
 * HAP (Human Application Protocol) SDK for PHP.
 *
 * HAP is an open standard for verified job applications. It enables Verification
 * Authorities (VAs) to cryptographically attest that an applicant took deliberate,
 * costly action when applying for a job.
 *
 * @example Verifying a claim (for employers)
 * ```php
 * use BlueScroll\Hap\Hap;
 *
 * $claim = Hap::verifyHapClaim('hap_abc123xyz456', 'ballista.io');
 * if ($claim && !Hap::isClaimExpired($claim)) {
 *     echo "Verified application to " . $claim['to']['company'];
 * }
 * ```
 */
final class Hap
{
    /** Protocol version */
    public const VERSION = '0.1';

    /** HAP ID regex pattern */
    public const HAP_ID_PATTERN = '/^hap_[a-zA-Z0-9]{12}$/';

    /** Characters for HAP ID generation */
    private const HAP_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    /** Claim types */
    public const CLAIM_TYPE_HUMAN_EFFORT = 'human_effort';
    public const CLAIM_TYPE_EMPLOYER_COMMITMENT = 'employer_commitment';

    /** Verification methods */
    public const METHOD_PHYSICAL_MAIL = 'physical_mail';
    public const METHOD_VIDEO_INTERVIEW = 'video_interview';
    public const METHOD_PAID_ASSESSMENT = 'paid_assessment';
    public const METHOD_REFERRAL = 'referral';

    /** Commitment levels */
    public const COMMITMENT_REVIEW_VERIFIED = 'review_verified';
    public const COMMITMENT_PRIORITIZE_VERIFIED = 'prioritize_verified';
    public const COMMITMENT_RESPOND_VERIFIED = 'respond_verified';

    /** Revocation reasons */
    public const REVOCATION_FRAUD = 'fraud';
    public const REVOCATION_ERROR = 'error';
    public const REVOCATION_LEGAL = 'legal';
    public const REVOCATION_USER_REQUEST = 'user_request';

    /**
     * Validates a HAP ID format.
     *
     * @param string $id The HAP ID to validate
     * @return bool True if the ID matches the format hap_[a-zA-Z0-9]{12}
     */
    public static function isValidHapId(string $id): bool
    {
        return preg_match(self::HAP_ID_PATTERN, $id) === 1;
    }

    /**
     * Generates a cryptographically secure random HAP ID.
     *
     * @return string A HAP ID in the format hap_[a-zA-Z0-9]{12}
     */
    public static function generateHapId(): string
    {
        $suffix = '';
        $chars = self::HAP_ID_CHARS;
        $charsLen = strlen($chars);

        for ($i = 0; $i < 12; $i++) {
            $suffix .= $chars[random_int(0, $charsLen - 1)];
        }

        return 'hap_' . $suffix;
    }
}
