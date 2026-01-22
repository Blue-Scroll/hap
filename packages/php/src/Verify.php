<?php

declare(strict_types=1);

namespace BlueScroll\HumanAttestation;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\GuzzleException;

/**
 * HAP claim verification functions.
 */
final class Verify
{
    /** Default timeout for HTTP requests (seconds) */
    private const DEFAULT_TIMEOUT = 10;

    private Client $client;

    public function __construct(?Client $client = null)
    {
        $this->client = $client ?? new Client([
            'timeout' => self::DEFAULT_TIMEOUT,
            'headers' => ['Accept' => 'application/json'],
        ]);
    }

    /**
     * Fetches the public keys from a VA's well-known endpoint.
     *
     * @param string $issuerDomain The VA's domain (e.g., "ballista.jobs")
     * @return array The VA's public key configuration
     * @throws VerificationException If the request fails
     */
    public function fetchPublicKeys(string $issuerDomain): array
    {
        $url = "https://{$issuerDomain}/.well-known/hap.json";

        try {
            $response = $this->client->get($url);
            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            throw new VerificationException("Failed to fetch public keys: " . $e->getMessage());
        }
    }

    /**
     * Fetches and verifies a HAP claim from a VA.
     *
     * @param string $hapId The HAP ID to verify
     * @param string $issuerDomain The VA's domain
     * @return array The verification response from the VA
     */
    public function fetchClaim(string $hapId, string $issuerDomain): array
    {
        if (!HumanAttestation::isValidId($hapId)) {
            return ['valid' => false, 'error' => 'invalid_format'];
        }

        $url = "https://{$issuerDomain}/api/v1/verify/{$hapId}";

        try {
            $response = $this->client->get($url);
            return json_decode($response->getBody()->getContents(), true);
        } catch (GuzzleException $e) {
            throw new VerificationException("Failed to fetch claim: " . $e->getMessage());
        }
    }

    /**
     * Verifies a JWS signature against a VA's public keys.
     *
     * @param string $jws The JWS compact serialization string
     * @param string $issuerDomain The VA's domain to fetch public keys from
     * @return array Verification result with 'valid', 'claim', and 'error' keys
     */
    public function verifySignature(string $jws, string $issuerDomain): array
    {
        try {
            // Fetch public keys
            $wellKnown = $this->fetchPublicKeys($issuerDomain);

            // Parse the JWS header
            $parts = explode('.', $jws);
            if (count($parts) !== 3) {
                return ['valid' => false, 'error' => 'Invalid JWS format'];
            }

            $header = json_decode(self::base64UrlDecode($parts[0]), true);
            $kid = $header['kid'] ?? null;

            if (!$kid) {
                return ['valid' => false, 'error' => 'JWS header missing kid'];
            }

            // Find the matching key
            $jwk = null;
            foreach ($wellKnown['keys'] as $key) {
                if ($key['kid'] === $kid) {
                    $jwk = $key;
                    break;
                }
            }

            if (!$jwk) {
                return ['valid' => false, 'error' => "Key not found: {$kid}"];
            }

            // Decode the public key
            $publicKeyBytes = self::base64UrlDecode($jwk['x']);

            // Verify signature using sodium
            $signingInput = $parts[0] . '.' . $parts[1];
            $signature = self::base64UrlDecode($parts[2]);

            if (!sodium_crypto_sign_verify_detached($signature, $signingInput, $publicKeyBytes)) {
                return ['valid' => false, 'error' => 'Signature verification failed'];
            }

            // Decode the payload
            $payload = json_decode(self::base64UrlDecode($parts[1]), true);

            // Verify issuer matches
            if (($payload['iss'] ?? null) !== $issuerDomain) {
                return [
                    'valid' => false,
                    'error' => "Issuer mismatch: expected {$issuerDomain}, got " . ($payload['iss'] ?? 'null'),
                ];
            }

            return ['valid' => true, 'claim' => $payload];
        } catch (\Exception $e) {
            return ['valid' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Fully verifies a HAP claim: fetches from VA and optionally verifies signature.
     *
     * @param string $hapId The HAP ID to verify
     * @param string $issuerDomain The VA's domain
     * @param bool $verifySig Whether to verify the cryptographic signature
     * @return array|null The claim if valid, null if not found or invalid
     */
    public function verifyClaim(string $hapId, string $issuerDomain, bool $verifySig = true): ?array
    {
        $response = $this->fetchClaim($hapId, $issuerDomain);

        if (!($response['valid'] ?? false)) {
            return null;
        }

        if ($verifySig && isset($response['jws'])) {
            $sigResult = $this->verifySignature($response['jws'], $issuerDomain);
            if (!$sigResult['valid']) {
                return null;
            }
        }

        return $response['claims'] ?? null;
    }

    /**
     * Extracts the HAP ID from a verification URL.
     *
     * @param string $url The verification URL
     * @return string|null The HAP ID or null if not found
     */
    public static function extractIdFromUrl(string $url): ?string
    {
        $parsed = parse_url($url);
        if (!isset($parsed['path'])) {
            return null;
        }

        $parts = explode('/', trim($parsed['path'], '/'));
        $lastPart = end($parts);

        return HumanAttestation::isValidId($lastPart) ? $lastPart : null;
    }

    /**
     * Checks if a claim is expired.
     *
     * @param array $claim The HAP claim to check
     * @return bool True if the claim has an exp field and is expired
     */
    public static function isClaimExpired(array $claim): bool
    {
        if (!isset($claim['exp'])) {
            return false;
        }

        try {
            $expTime = new \DateTimeImmutable($claim['exp']);
            return $expTime < new \DateTimeImmutable();
        } catch (\Exception $e) {
            return false;
        }
    }

    /**
     * Checks if the claim target matches the expected recipient.
     *
     * @param array $claim The HAP claim to check
     * @param string $recipientDomain The expected recipient domain
     * @return bool True if the claim's target domain matches
     */
    public static function isClaimForRecipient(array $claim, string $recipientDomain): bool
    {
        return ($claim['to']['domain'] ?? null) === $recipientDomain;
    }

    /**
     * Decode a base64url-encoded string.
     */
    private static function base64UrlDecode(string $data): string
    {
        $remainder = strlen($data) % 4;
        if ($remainder) {
            $data .= str_repeat('=', 4 - $remainder);
        }
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
