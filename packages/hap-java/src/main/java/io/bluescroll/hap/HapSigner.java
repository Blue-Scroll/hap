package io.bluescroll.hap;

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
 * OctetKeyPair keyPair = HapSigner.generateKeyPair();
 * HumanEffortClaim claim = HapSigner.createHumanEffortClaim(
 *     "physical_mail", "Acme Corp", "acme.com", "standard", "my-va.com", 730);
 * String jws = HapSigner.signClaim(claim, keyPair, "my_key_001");
 * }</pre>
 */
public class HapSigner {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private HapSigner() {} // Utility class

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
    public static String signClaim(HapClaim claim, OctetKeyPair keyPair, String kid) throws Exception {
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
     * Creates a complete human effort claim with all required fields.
     *
     * @param method Verification method (e.g., "physical_mail")
     * @param recipientName Recipient name
     * @param domain Recipient domain (optional, can be null)
     * @param tier Service tier (optional, can be null)
     * @param issuer VA's domain
     * @param expiresInDays Days until expiration (0 for no expiration)
     * @return A complete HumanEffortClaim object
     */
    public static HumanEffortClaim createHumanEffortClaim(
            String method,
            String recipientName,
            String domain,
            String tier,
            String issuer,
            int expiresInDays) {

        HumanEffortClaim claim = new HumanEffortClaim(method, recipientName, domain, tier, issuer);

        if (expiresInDays > 0) {
            Instant exp = Instant.now().plus(expiresInDays, ChronoUnit.DAYS);
            claim.setExp(exp.toString());
        }

        return claim;
    }

    /**
     * Creates a complete recipient commitment claim with all required fields.
     *
     * @param recipientName Recipient's name
     * @param recipientDomain Recipient's domain (optional, can be null)
     * @param commitment Commitment level (e.g., "review_verified")
     * @param issuer VA's domain
     * @param expiresInDays Days until expiration (0 for no expiration)
     * @return A complete RecipientCommitmentClaim object
     */
    public static RecipientCommitmentClaim createRecipientCommitmentClaim(
            String recipientName,
            String recipientDomain,
            String commitment,
            String issuer,
            int expiresInDays) {

        RecipientCommitmentClaim claim = new RecipientCommitmentClaim(
                recipientName, recipientDomain, commitment, issuer);

        if (expiresInDays > 0) {
            Instant exp = Instant.now().plus(expiresInDays, ChronoUnit.DAYS);
            claim.setExp(exp.toString());
        }

        return claim;
    }
}
