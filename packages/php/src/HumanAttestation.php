<?php

declare(strict_types=1);

namespace BlueScroll\HumanAttestation;

/**
 * HAP (Human Attestation Protocol) SDK for PHP.
 *
 * HAP is an open standard for verified human effort. It enables Verification
 * Authorities (VAs) to cryptographically attest that a sender took deliberate,
 * costly action when communicating with a recipient.
 *
 * @example Verifying a claim (for recipients)
 * ```php
 * use BlueScroll\HumanAttestation\HumanAttestation;
 *
 * $claim = HumanAttestation::verifyClaim('hap_abc123xyz456', 'ballista.jobs');
 * if ($claim && !HumanAttestation::isClaimExpired($claim)) {
 *     echo "Verified application to " . $claim['to']['name'];
 * }
 * ```
 */
final class HumanAttestation
{
    /** Protocol version */
    public const VERSION = '0.1';

    /** HAP Compact format version */
    public const COMPACT_VERSION = '1';

    /** HAP ID regex pattern */
    public const ID_PATTERN = '/^hap_[a-zA-Z0-9]{12}$/';

    /** Test HAP ID regex pattern */
    public const TEST_ID_PATTERN = '/^hap_test_[a-zA-Z0-9]{8}$/';

    /** HAP Compact format regex pattern (9 fields, no type) */
    public const COMPACT_PATTERN = '/^HAP1\.hap_[a-zA-Z0-9_]+\.[^.]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$/';

    /** Characters for HAP ID generation */
    private const ID_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

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
    public static function isValidId(string $id): bool
    {
        return preg_match(self::ID_PATTERN, $id) === 1;
    }

    /**
     * Generates a cryptographically secure random HAP ID.
     *
     * @return string A HAP ID in the format hap_[a-zA-Z0-9]{12}
     */
    public static function generateId(): string
    {
        $suffix = '';
        $chars = self::ID_CHARS;
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
    public static function generateTestId(): string
    {
        $suffix = '';
        $chars = self::ID_CHARS;
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
    public static function isTestId(string $id): bool
    {
        return preg_match(self::TEST_ID_PATTERN, $id) === 1;
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
