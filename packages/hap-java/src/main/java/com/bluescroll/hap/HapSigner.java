package com.bluescroll.hap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.*;
import com.nimbusds.jose.jwk.*;

import java.security.*;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * HAP claim signing utilities for Verification Authorities.
 *
 * <p>Example:
 * <pre>{@code
 * KeyPair keyPair = HapSigner.generateKeyPair();
 * HumanEffortClaim claim = HapSigner.createHumanEffortClaim(
 *     "physical_mail", "Acme Corp", "acme.com", "standard", "my-va.com", 730);
 * String jws = HapSigner.signClaim(claim, keyPair.getPrivate(), "my_key_001");
 * }</pre>
 */
public class HapSigner {
    private static final ObjectMapper objectMapper = new ObjectMapper();

    private HapSigner() {} // Utility class

    /**
     * Generates a new Ed25519 key pair for signing HAP claims.
     *
     * @return A KeyPair containing the private and public keys
     * @throws NoSuchAlgorithmException if Ed25519 is not available
     */
    public static KeyPair generateKeyPair() throws NoSuchAlgorithmException {
        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("Ed25519");
        return keyGen.generateKeyPair();
    }

    /**
     * Exports a public key to JWK format suitable for /.well-known/hap.json.
     *
     * @param publicKey The public key to export
     * @param kid The key ID to assign
     * @return A map representing the JWK
     */
    public static Map<String, String> exportPublicKeyJwk(PublicKey publicKey, String kid) {
        OctetKeyPair okp = OctetKeyPair.parse(publicKey, null).toPublicJWK();

        Map<String, String> jwk = new LinkedHashMap<>();
        jwk.put("kid", kid);
        jwk.put("kty", "OKP");
        jwk.put("crv", "Ed25519");
        jwk.put("x", okp.getX().toString());
        return jwk;
    }

    /**
     * Signs a HAP claim with an Ed25519 private key.
     *
     * @param claim The claim to sign
     * @param privateKey The Ed25519 private key
     * @param kid Key ID to include in JWS header
     * @return JWS compact serialization string
     * @throws Exception if signing fails
     */
    public static String signClaim(HapClaim claim, PrivateKey privateKey, String kid) throws Exception {
        String payload = objectMapper.writeValueAsString(claim);

        OctetKeyPair okp = OctetKeyPair.parse(privateKey, null);

        JWSSigner signer = new Ed25519Signer(okp);

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
     * @param company Target company name
     * @param domain Target company domain (optional, can be null)
     * @param tier Service tier (optional, can be null)
     * @param issuer VA's domain
     * @param expiresInDays Days until expiration (0 for no expiration)
     * @return A complete HumanEffortClaim object
     */
    public static HumanEffortClaim createHumanEffortClaim(
            String method,
            String company,
            String domain,
            String tier,
            String issuer,
            int expiresInDays) {

        HumanEffortClaim claim = new HumanEffortClaim(method, company, domain, tier, issuer);

        if (expiresInDays > 0) {
            Instant exp = Instant.now().plus(expiresInDays, ChronoUnit.DAYS);
            claim.setExp(exp.toString());
        }

        return claim;
    }

    /**
     * Creates a complete employer commitment claim with all required fields.
     *
     * @param employerName Employer's name
     * @param employerDomain Employer's domain (optional, can be null)
     * @param commitment Commitment level (e.g., "review_verified")
     * @param issuer VA's domain
     * @param expiresInDays Days until expiration (0 for no expiration)
     * @return A complete EmployerCommitmentClaim object
     */
    public static EmployerCommitmentClaim createEmployerCommitmentClaim(
            String employerName,
            String employerDomain,
            String commitment,
            String issuer,
            int expiresInDays) {

        EmployerCommitmentClaim claim = new EmployerCommitmentClaim(
                employerName, employerDomain, commitment, issuer);

        if (expiresInDays > 0) {
            Instant exp = Instant.now().plus(expiresInDays, ChronoUnit.DAYS);
            claim.setExp(exp.toString());
        }

        return claim;
    }
}
