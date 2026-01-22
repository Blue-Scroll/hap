<?php

declare(strict_types=1);

namespace BlueScroll\HumanAttestation;

/**
 * HAP Compact Format utilities for space-efficient serialization.
 *
 * Format: HAP{version}.{id}.{method}.{to_name}.{to_domain}.{at}.{exp}.{iss}.{signature}
 *
 * Note: Effort dimensions (cost, time, physical, energy) are NOT included in compact format.
 * Compact is for QR codes - minimal representation. Full claims in JWS include all dimensions.
 *
 * @example
 * HAP1.hap_abc123xyz456.ba_priority_mail.Acme%20Corp.acme%2Ecom.1706169600.1769241600.ballista%2Ejobs.MEUCIQDx...
 */
final class Compact
{
    /**
     * Encodes a field for compact format (URL-encode + encode dots).
     */
    private static function encodeCompactField(string $value): string
    {
        return str_replace('.', '%2E', rawurlencode($value));
    }

    /**
     * Decodes a compact format field.
     */
    private static function decodeCompactField(string $value): string
    {
        return rawurldecode($value);
    }

    /**
     * Convert ISO 8601 timestamp to Unix epoch seconds.
     */
    private static function isoToUnix(string $iso): int
    {
        return (new \DateTimeImmutable($iso))->getTimestamp();
    }

    /**
     * Convert Unix epoch seconds to ISO 8601 timestamp.
     */
    private static function unixToIso(int $unix): string
    {
        return (new \DateTimeImmutable('@' . $unix))
            ->setTimezone(new \DateTimeZone('UTC'))
            ->format(\DateTimeInterface::ATOM);
    }

    /**
     * Encodes a HAP claim and signature into compact format (9 fields).
     *
     * @param array $claim The claim to encode
     * @param string $signature The Ed25519 signature bytes (64 bytes)
     * @return string Compact format string
     */
    public static function encodeCompact(array $claim, string $signature): string
    {
        $to = $claim['to'] ?? [];
        $name = $to['name'] ?? '';
        $domain = $to['domain'] ?? '';

        $atUnix = self::isoToUnix($claim['at']);
        $expUnix = isset($claim['exp']) ? self::isoToUnix($claim['exp']) : 0;

        return implode('.', [
            'HAP' . HumanAttestation::COMPACT_VERSION,
            $claim['id'],
            $claim['method'] ?? '',
            self::encodeCompactField($name),
            self::encodeCompactField($domain),
            (string) $atUnix,
            (string) $expUnix,
            self::encodeCompactField($claim['iss']),
            Sign::base64UrlEncode($signature)
        ]);
    }

    /**
     * Decodes a compact format string into claim and signature.
     *
     * @param string $compact The compact format string
     * @return array{claim: array, signature: string}
     * @throws \InvalidArgumentException If format is invalid
     */
    public static function decodeCompact(string $compact): array
    {
        if (!self::isValidCompact($compact)) {
            throw new \InvalidArgumentException('Invalid HAP Compact format');
        }

        $parts = explode('.', $compact);
        if (count($parts) !== 9) {
            throw new \InvalidArgumentException('Invalid HAP Compact format: expected 9 fields');
        }

        [$version, $hapId, $method, $encodedName, $encodedDomain, $atUnixStr, $expUnixStr, $encodedIss, $sigB64] = $parts;

        if ($version !== 'HAP' . HumanAttestation::COMPACT_VERSION) {
            throw new \InvalidArgumentException("Unsupported compact version: {$version}");
        }

        $name = self::decodeCompactField($encodedName);
        $domain = self::decodeCompactField($encodedDomain);
        $iss = self::decodeCompactField($encodedIss);
        $atUnix = (int) $atUnixStr;
        $expUnix = (int) $expUnixStr;
        $signature = Sign::base64UrlDecode($sigB64);

        $at = self::unixToIso($atUnix);
        $exp = $expUnix !== 0 ? self::unixToIso($expUnix) : null;

        $claim = [
            'v' => HumanAttestation::VERSION,
            'id' => $hapId,
            'method' => $method,
            'description' => '', // Not included in compact format
            'to' => ['name' => $name],
            'at' => $at,
            'iss' => $iss
        ];

        if ($domain !== '') {
            $claim['to']['domain'] = $domain;
        }

        if ($exp !== null) {
            $claim['exp'] = $exp;
        }

        return ['claim' => $claim, 'signature' => $signature];
    }

    /**
     * Validates if a string is a valid HAP Compact format.
     *
     * @param string $compact The string to validate
     * @return bool True if valid compact format
     */
    public static function isValidCompact(string $compact): bool
    {
        return preg_match(HumanAttestation::COMPACT_PATTERN, $compact) === 1;
    }

    /**
     * Builds the compact payload (everything before the signature).
     * This is what gets signed.
     *
     * @param array $claim The claim
     * @return string Compact payload string (8 fields)
     */
    public static function buildCompactPayload(array $claim): string
    {
        $to = $claim['to'] ?? [];
        $name = $to['name'] ?? '';
        $domain = $to['domain'] ?? '';

        $atUnix = self::isoToUnix($claim['at']);
        $expUnix = isset($claim['exp']) ? self::isoToUnix($claim['exp']) : 0;

        return implode('.', [
            'HAP' . HumanAttestation::COMPACT_VERSION,
            $claim['id'],
            $claim['method'] ?? '',
            self::encodeCompactField($name),
            self::encodeCompactField($domain),
            (string) $atUnix,
            (string) $expUnix,
            self::encodeCompactField($claim['iss'])
        ]);
    }

    /**
     * Signs a claim and returns it in compact format.
     *
     * @param array $claim The claim to sign
     * @param string $privateKey The Ed25519 private key
     * @return string Signed compact format string
     */
    public static function signCompact(array $claim, string $privateKey): string
    {
        $payload = self::buildCompactPayload($claim);
        $signature = sodium_crypto_sign_detached($payload, $privateKey);
        return $payload . '.' . Sign::base64UrlEncode($signature);
    }

    /**
     * Verifies a compact format string using provided public keys.
     *
     * @param string $compact The compact format string
     * @param array $publicKeys Array of JWK public keys to try
     * @return array{valid: bool, claim?: array, error?: string}
     */
    public static function verifyCompact(string $compact, array $publicKeys): array
    {
        if (!self::isValidCompact($compact)) {
            return ['valid' => false, 'error' => 'Invalid compact format'];
        }

        try {
            // Split to get payload and signature
            $lastDot = strrpos($compact, '.');
            $payload = substr($compact, 0, $lastDot);
            $sigB64 = substr($compact, $lastDot + 1);
            $signature = Sign::base64UrlDecode($sigB64);

            // Try each public key
            foreach ($publicKeys as $jwk) {
                try {
                    $xB64 = $jwk['x'] ?? '';
                    $publicKeyBytes = Sign::base64UrlDecode($xB64);

                    // Verify signature
                    if (sodium_crypto_sign_verify_detached($signature, $payload, $publicKeyBytes)) {
                        $decoded = self::decodeCompact($compact);
                        return ['valid' => true, 'claim' => $decoded['claim']];
                    }
                } catch (\Exception $e) {
                    // Try next key
                    continue;
                }
            }

            return ['valid' => false, 'error' => 'Signature verification failed'];
        } catch (\Exception $e) {
            return ['valid' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Generates a verification URL with embedded compact claim.
     *
     * @param string $baseUrl Base verification URL (e.g., "https://ballista.jobs/v")
     * @param string $compact The compact format string
     * @return string URL with compact claim in query parameter
     */
    public static function generateVerificationUrl(string $baseUrl, string $compact): string
    {
        return $baseUrl . '?c=' . rawurlencode($compact);
    }

    /**
     * Extracts compact claim from a verification URL.
     *
     * @param string $url The verification URL
     * @return string|null Compact string or null if not found
     */
    public static function extractCompactFromUrl(string $url): ?string
    {
        try {
            $parsed = parse_url($url);
            if (!isset($parsed['query'])) {
                return null;
            }

            parse_str($parsed['query'], $params);
            $compact = $params['c'] ?? null;

            if ($compact !== null && self::isValidCompact($compact)) {
                return $compact;
            }

            return null;
        } catch (\Exception $e) {
            return null;
        }
    }
}
