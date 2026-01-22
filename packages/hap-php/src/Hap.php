<?php

declare(strict_types=1);

namespace BlueScroll\Hap;

/**
 * HAP (Human Attestation Protocol) SDK for PHP.
 *
 * HAP is an open standard for verified human effort. It enables Verification
 * Authorities (VAs) to cryptographically attest that a sender took deliberate,
 * costly action when communicating with a recipient.
 *
 * @example Verifying a claim (for recipients)
 * ```php
 * use BlueScroll\Hap\Hap;
 *
 * $claim = Hap::verifyHapClaim('hap_abc123xyz456', 'ballista.jobs');
 * if ($claim && !Hap::isClaimExpired($claim)) {
 *     echo "Verified application to " . $claim['to']['name'];
 * }
 * ```
 */
final class Hap
{
    /** Protocol version */
    public const VERSION = '0.1';

    /** HAP Compact format version */
    public const COMPACT_VERSION = '1';

    /** HAP ID regex pattern */
    public const HAP_ID_PATTERN = '/^hap_[a-zA-Z0-9]{12}$/';

    /** Test HAP ID regex pattern */
    public const HAP_TEST_ID_PATTERN = '/^hap_test_[a-zA-Z0-9]{8}$/';

    /** HAP Compact format regex pattern */
    public const HAP_COMPACT_PATTERN = '/^HAP1\.hap_[a-zA-Z0-9_]+\.[a-z_]+\.[a-z_]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$/';

    /** Characters for HAP ID generation */
    private const HAP_ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    /** Claim types */
    public const CLAIM_TYPE_HUMAN_EFFORT = 'human_effort';
    public const CLAIM_TYPE_RECIPIENT_COMMITMENT = 'recipient_commitment';
    public const CLAIM_TYPE_PHYSICAL_DELIVERY = 'physical_delivery';
    public const CLAIM_TYPE_FINANCIAL_COMMITMENT = 'financial_commitment';
    public const CLAIM_TYPE_CONTENT_ATTESTATION = 'content_attestation';

    /** Verification methods */
    public const METHOD_PHYSICAL_MAIL = 'physical_mail';
    public const METHOD_VIDEO_INTERVIEW = 'video_interview';
    public const METHOD_PAID_ASSESSMENT = 'paid_assessment';
    public const METHOD_REFERRAL = 'referral';
    public const METHOD_PAYMENT = 'payment';
    public const METHOD_TRUTHFULNESS_CONFIRMATION = 'truthfulness_confirmation';

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

    /**
     * Generates a test HAP ID (for previews and development).
     *
     * @return string A test HAP ID in the format hap_test_[a-zA-Z0-9]{8}
     */
    public static function generateTestHapId(): string
    {
        $suffix = '';
        $chars = self::HAP_ID_CHARS;
        $charsLen = strlen($chars);

        for ($i = 0; $i < 8; $i++) {
            $suffix .= $chars[random_int(0, $charsLen - 1)];
        }

        return 'hap_test_' . $suffix;
    }

    /**
     * Checks if a HAP ID is a test ID.
     *
     * @param string $id The HAP ID to check
     * @return bool True if the ID is a test ID
     */
    public static function isTestHapId(string $id): bool
    {
        return preg_match(self::HAP_TEST_ID_PATTERN, $id) === 1;
    }

    /**
     * Computes SHA-256 hash of content with prefix.
     *
     * @param string $content The content to hash
     * @return string Hash string in format "sha256:xxxxx"
     */
    public static function hashContent(string $content): string
    {
        return 'sha256:' . hash('sha256', $content);
    }
}
