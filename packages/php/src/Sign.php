<?php

declare(strict_types=1);

namespace BlueScroll\HumanAttestation;

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
        $claim['v'] = $claim['v'] ?? HumanAttestation::VERSION;

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
     * Creates a complete HAP claim with all required fields.
     *
     * @param string $method VA-specific verification method identifier
     * @param string $description Human-readable description of the effort
     * @param string $recipientName Recipient name
     * @param string $issuer VA's domain
     * @param string|null $domain Recipient domain (optional)
     * @param string|null $tier Service tier (optional)
     * @param int|null $expiresInDays Days until expiration (optional)
     * @param array|null $cost Monetary cost ['amount' => int, 'currency' => string] (optional)
     * @param int|null $time Time in seconds (optional)
     * @param bool|null $physical Whether physical atoms involved (optional)
     * @param int|null $energy Energy in kilocalories (optional)
     * @return array A complete HAP claim
     */
    public static function createClaim(
        string $method,
        string $description,
        string $recipientName,
        string $issuer,
        ?string $domain = null,
        ?string $tier = null,
        ?int $expiresInDays = null,
        ?array $cost = null,
        ?int $time = null,
        ?bool $physical = null,
        ?int $energy = null
    ): array {
        $now = new \DateTimeImmutable('now', new \DateTimeZone('UTC'));

        $claim = [
            'v' => HumanAttestation::VERSION,
            'id' => HumanAttestation::generateId(),
            'method' => $method,
            'description' => $description,
            'to' => ['name' => $recipientName],
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

        // Add effort dimensions if provided
        if ($cost !== null) {
            $claim['cost'] = $cost;
        }

        if ($time !== null) {
            $claim['time'] = $time;
        }

        if ($physical !== null) {
            $claim['physical'] = $physical;
        }

        if ($energy !== null) {
            $claim['energy'] = $energy;
        }

        return $claim;
    }

    /**
     * Encode data to base64url format.
     */
    public static function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    /**
     * Decode data from base64url format.
     */
    public static function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'), true);
    }
}
