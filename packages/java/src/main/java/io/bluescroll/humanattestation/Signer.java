package io.bluescroll.humanattestation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.*;
import com.nimbusds.jose.jwk.*;
import com.nimbusds.jose.jwk.gen.OctetKeyPairGenerator;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * HAP claim signing utilities for Verification Authorities.
 *
 * <p>Example:
 * <pre>{@code
 * OctetKeyPair keyPair = Signer.generateKeyPair();
 * Claim claim = Signer.createClaim(
 *     "ba_priority_mail",
 *     "Priority mail packet with handwritten cover letter",
 *     "Acme Corp", "acme.com", "standard", "ballista.jobs", 730,
 *     new Claim.ClaimCost(1500, "USD"), 1800, true, null);
 * String jws = Signer.signClaim(claim, keyPair, "my_key_001");
 * }</pre>
 */
public class Signer {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private Signer() {} // Utility class

    /**
     * Generates a new Ed25519 key pair for signing HAP claims.
     *
     * @return An OctetKeyPair containing the private and public keys
     * @throws JOSEException if key generation fails
     */
    public static OctetKeyPair generateKeyPair() throws JOSEException {
        return new OctetKeyPairGenerator(Curve.Ed25519).generate();
    }

    /**
     * Exports a public key to JWK format suitable for /.well-known/hap.json.
     *
     * @param keyPair The key pair to export the public key from
     * @param kid The key ID to assign
     * @return A map representing the JWK
     */
    public static Map<String, String> exportPublicKeyJwk(OctetKeyPair keyPair, String kid) {
        OctetKeyPair publicKey = keyPair.toPublicJWK();

        Map<String, String> jwk = new LinkedHashMap<>();
        jwk.put("kid", kid);
        jwk.put("kty", "OKP");
        jwk.put("crv", "Ed25519");
        jwk.put("x", publicKey.getX().toString());
        return jwk;
    }

    /**
     * Signs a HAP claim with an Ed25519 key pair.
     *
     * @param claim The claim to sign
     * @param keyPair The Ed25519 key pair (must contain private key)
     * @param kid Key ID to include in JWS header
     * @return JWS compact serialization string
     * @throws Exception if signing fails
     */
    public static String signClaim(Claim claim, OctetKeyPair keyPair, String kid) throws Exception {
        String payload = objectMapper.writeValueAsString(claim);

        JWSSigner signer = new Ed25519Signer(keyPair);

        JWSHeader header = new JWSHeader.Builder(JWSAlgorithm.EdDSA)
                .keyID(kid)
                .build();

        JWSObject jwsObject = new JWSObject(header, new Payload(payload));
        jwsObject.sign(signer);

        return jwsObject.serialize();
    }

    /**
     * Creates a complete HAP claim with all required fields.
     *
     * @param method VA-specific verification method identifier
     * @param description Human-readable description of the effort
     * @param recipientName Recipient name
     * @param domain Recipient domain (optional, can be null)
     * @param tier Service tier (optional, can be null)
     * @param issuer VA's domain
     * @param expiresInDays Days until expiration (0 for no expiration)
     * @param cost Monetary cost (optional, can be null)
     * @param time Time in seconds (optional, can be null)
     * @param physical Whether physical atoms involved (optional, can be null)
     * @param energy Energy in kilocalories (optional, can be null)
     * @return A complete Claim object
     */
    public static Claim createClaim(
            String method,
            String description,
            String recipientName,
            String domain,
            String tier,
            String issuer,
            int expiresInDays,
            Claim.ClaimCost cost,
            Integer time,
            Boolean physical,
            Integer energy) {

        Claim claim = new Claim(method, description, recipientName, domain, tier, issuer);

        if (expiresInDays > 0) {
            Instant exp = Instant.now().plus(expiresInDays, ChronoUnit.DAYS);
            claim.setExp(exp.toString());
        }

        // Add effort dimensions if provided
        if (cost != null) {
            claim.setCost(cost);
        }

        if (time != null) {
            claim.setTime(time);
        }

        if (physical != null) {
            claim.setPhysical(physical);
        }

        if (energy != null) {
            claim.setEnergy(energy);
        }

        return claim;
    }

    /**
     * Creates a complete HAP claim with required fields only.
     *
     * @param method VA-specific verification method identifier
     * @param description Human-readable description of the effort
     * @param recipientName Recipient name
     * @param domain Recipient domain (optional, can be null)
     * @param tier Service tier (optional, can be null)
     * @param issuer VA's domain
     * @param expiresInDays Days until expiration (0 for no expiration)
     * @return A complete Claim object
     */
    public static Claim createClaim(
            String method,
            String description,
            String recipientName,
            String domain,
            String tier,
            String issuer,
            int expiresInDays) {

        return createClaim(method, description, recipientName, domain, tier, issuer,
                           expiresInDays, null, null, null, null);
    }
}
