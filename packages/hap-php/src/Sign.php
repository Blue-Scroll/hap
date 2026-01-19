<?php

declare(strict_types=1);

namespace BlueScroll\Hap;

/**
 * HAP claim signing functions (for Verification Authorities).
 */
final class Sign
{
    /**
     * Generates a new Ed25519 key pair for signing HAP claims.
     *
     * @return array{privateKey: string, publicKey: string} Private and public keys
     */
    public static function generateKeyPair(): array
    {
        $keyPair = sodium_crypto_sign_keypair();

        return [
            'privateKey' => sodium_crypto_sign_secretkey($keyPair),
            'publicKey' => sodium_crypto_sign_publickey($keyPair),
        ];
    }

    /**
     * Exports a public key to JWK format suitable for /.well-known/hap.json.
     *
     * @param string $publicKey The public key bytes
     * @param string $kid The key ID to assign
     * @return array JWK array
     */
    public static function exportPublicKeyJwk(string $publicKey, string $kid): array
    {
        return [
            'kid' => $kid,
            'kty' => 'OKP',
            'crv' => 'Ed25519',
            'x' => self::base64UrlEncode($publicKey),
        ];
    }

    /**
     * Signs a HAP claim with an Ed25519 private key.
     *
     * @param array $claim The claim to sign
     * @param string $privateKey The Ed25519 private key
     * @param string $kid Key ID to include in JWS header
     * @return string JWS compact serialization string
     */
    public static function signClaim(array $claim, string $privateKey, string $kid): string
    {
        // Ensure version is set
        $claim['v'] = $claim['v'] ?? Hap::VERSION;

        // Create header
        $header = ['alg' => 'EdDSA', 'kid' => $kid];

        // Encode header and payload
        $headerB64 = self::base64UrlEncode(json_encode($header));
        $payloadB64 = self::base64UrlEncode(json_encode($claim));

        // Create signing input
        $signingInput = "{$headerB64}.{$payloadB64}";

        // Sign
        $signature = sodium_crypto_sign_detached($signingInput, $privateKey);
        $signatureB64 = self::base64UrlEncode($signature);

        return "{$signingInput}.{$signatureB64}";
    }

    /**
     * Creates a complete human effort claim with all required fields.
     *
     * @param string $method Verification method (e.g., "physical_mail")
     * @param string $company Target company name
     * @param string $issuer VA's domain
     * @param string|null $domain Target company domain (optional)
     * @param string|null $tier Service tier (optional)
     * @param int|null $expiresInDays Days until expiration (optional)
     * @return array A complete human effort claim
     */
    public static function createHumanEffortClaim(
        string $method,
        string $company,
        string $issuer,
        ?string $domain = null,
        ?string $tier = null,
        ?int $expiresInDays = null
    ): array {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        $claim = [
            'v' => Hap::VERSION,
            'id' => Hap::generateHapId(),
            'type' => Hap::CLAIM_TYPE_HUMAN_EFFORT,
            'method' => $method,
            'to' => ['company' => $company],
            'at' => $now->format(\DateTimeInterface::ATOM),
            'iss' => $issuer,
        ];

        if ($domain !== null) {
            $claim['to']['domain'] = $domain;
        }

        if ($tier !== null) {
            $claim['tier'] = $tier;
        }

        if ($expiresInDays !== null) {
            $exp = $now->modify("+{$expiresInDays} days");
            $claim['exp'] = $exp->format(\DateTimeInterface::ATOM);
        }

        return $claim;
    }

    /**
     * Creates a complete employer commitment claim with all required fields.
     *
     * @param string $employerName Employer's name
     * @param string $commitment Commitment level (e.g., "review_verified")
     * @param string $issuer VA's domain
     * @param string|null $employerDomain Employer's domain (optional)
     * @param int|null $expiresInDays Days until expiration (optional)
     * @return array A complete employer commitment claim
     */
    public static function createEmployerCommitmentClaim(
        string $employerName,
        string $commitment,
        string $issuer,
        ?string $employerDomain = null,
        ?int $expiresInDays = null
    ): array {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        $claim = [
            'v' => Hap::VERSION,
            'id' => Hap::generateHapId(),
            'type' => Hap::CLAIM_TYPE_EMPLOYER_COMMITMENT,
            'employer' => ['name' => $employerName],
            'commitment' => $commitment,
            'at' => $now->format(\DateTimeInterface::ATOM),
            'iss' => $issuer,
        ];

        if ($employerDomain !== null) {
            $claim['employer']['domain'] = $employerDomain;
        }

        if ($expiresInDays !== null) {
            $exp = $now->modify("+{$expiresInDays} days");
            $claim['exp'] = $exp->format(\DateTimeInterface::ATOM);
        }

        return $claim;
    }

    /**
     * Encode data to base64url format.
     */
    private static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
