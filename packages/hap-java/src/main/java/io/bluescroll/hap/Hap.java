package io.bluescroll.hap;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nimbusds.jose.*;
import com.nimbusds.jose.crypto.*;
import com.nimbusds.jose.jwk.*;
import okhttp3.*;

import java.io.IOException;
import java.net.URI;
import java.security.*;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.regex.Pattern;

/**
 * HAP (Human Application Protocol) SDK for Java.
 *
 * <p>HAP is an open standard for verified job applications. It enables Verification
 * Authorities (VAs) to cryptographically attest that an applicant took deliberate,
 * costly action when applying for a job.
 *
 * <p>Example - Verifying a claim (for employers):
 * <pre>{@code
 * HumanEffortClaim claim = Hap.verifyHapClaim("hap_abc123xyz456", "ballista.io");
 * if (claim != null && !Hap.isClaimExpired(claim)) {
 *     System.out.println("Verified application to " + claim.getTo().getCompany());
 * }
 * }</pre>
 */
public class Hap {
    /** Protocol version */
    public static final String VERSION = "0.1";

    /** HAP ID regex pattern */
    public static final Pattern HAP_ID_PATTERN = Pattern.compile("^hap_[a-zA-Z0-9]{12}$");

    /** Characters for HAP ID generation */
    private static final String HAP_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(Duration.ofSeconds(10))
            .build();

    private Hap() {} // Utility class

    /**
     * Validates a HAP ID format.
     *
     * @param id The HAP ID to validate
     * @return true if the ID matches the format hap_[a-zA-Z0-9]{12}
     */
    public static boolean isValidHapId(String id) {
        return id != null && HAP_ID_PATTERN.matcher(id).matches();
    }

    /**
     * Generates a cryptographically secure random HAP ID.
     *
     * @return A HAP ID in the format hap_[a-zA-Z0-9]{12}
     */
    public static String generateHapId() {
        SecureRandom random = new SecureRandom();
        StringBuilder suffix = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            suffix.append(HAP_ID_CHARS.charAt(random.nextInt(HAP_ID_CHARS.length())));
        }
        return "hap_" + suffix;
    }

    /**
     * Fetches the public keys from a VA's well-known endpoint.
     *
     * @param issuerDomain The VA's domain (e.g., "ballista.io")
     * @return The VA's public key configuration
     * @throws IOException if the request fails
     */
    public static HapWellKnown fetchPublicKeys(String issuerDomain) throws IOException {
        String url = "https://" + issuerDomain + "/.well-known/hap.json";
        Request request = new Request.Builder()
                .url(url)
                .header("Accept", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to fetch public keys: HTTP " + response.code());
            }
            return objectMapper.readValue(response.body().string(), HapWellKnown.class);
        }
    }

    /**
     * Fetches and verifies a HAP claim from a VA.
     *
     * @param hapId The HAP ID to verify
     * @param issuerDomain The VA's domain (e.g., "ballista.io")
     * @return The verification response from the VA
     * @throws IOException if the request fails
     */
    public static VerificationResponse fetchClaim(String hapId, String issuerDomain) throws IOException {
        if (!isValidHapId(hapId)) {
            VerificationResponse response = new VerificationResponse();
            response.setValid(false);
            response.setError("invalid_format");
            return response;
        }

        String url = "https://" + issuerDomain + "/api/v1/verify/" + hapId;
        Request request = new Request.Builder()
                .url(url)
                .header("Accept", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            return objectMapper.readValue(response.body().string(), VerificationResponse.class);
        }
    }

    /**
     * Fully verifies a HAP claim: fetches from VA and optionally verifies signature.
     *
     * @param hapId The HAP ID to verify
     * @param issuerDomain The VA's domain
     * @return The claim if valid, null if not found or invalid
     * @throws IOException if the request fails
     */
    public static HumanEffortClaim verifyHapClaim(String hapId, String issuerDomain) throws IOException {
        return verifyHapClaim(hapId, issuerDomain, true);
    }

    /**
     * Fully verifies a HAP claim: fetches from VA and optionally verifies signature.
     *
     * @param hapId The HAP ID to verify
     * @param issuerDomain The VA's domain
     * @param verifySignature Whether to verify the cryptographic signature
     * @return The claim if valid, null if not found or invalid
     * @throws IOException if the request fails
     */
    public static HumanEffortClaim verifyHapClaim(String hapId, String issuerDomain, boolean verifySignature) throws IOException {
        VerificationResponse response = fetchClaim(hapId, issuerDomain);

        if (!response.isValid()) {
            return null;
        }

        if (verifySignature && response.getJws() != null) {
            try {
                SignatureVerificationResult result = verifySignature(response.getJws(), issuerDomain);
                if (!result.isValid()) {
                    return null;
                }
            } catch (Exception e) {
                return null;
            }
        }

        return response.getClaims();
    }

    /**
     * Verifies a JWS signature against a VA's public keys.
     *
     * @param jwsString The JWS compact serialization string
     * @param issuerDomain The VA's domain to fetch public keys from
     * @return Verification result with decoded claim if valid
     */
    public static SignatureVerificationResult verifySignature(String jwsString, String issuerDomain) {
        try {
            HapWellKnown wellKnown = fetchPublicKeys(issuerDomain);

            JWSObject jwsObject = JWSObject.parse(jwsString);
            String kid = jwsObject.getHeader().getKeyID();

            if (kid == null) {
                return new SignatureVerificationResult(false, null, "JWS header missing kid");
            }

            HapWellKnown.HapJwk matchingKey = null;
            for (HapWellKnown.HapJwk key : wellKnown.getKeys()) {
                if (kid.equals(key.getKid())) {
                    matchingKey = key;
                    break;
                }
            }

            if (matchingKey == null) {
                return new SignatureVerificationResult(false, null, "Key not found: " + kid);
            }

            OctetKeyPair okp = new OctetKeyPair.Builder(Curve.Ed25519,
                    com.nimbusds.jose.util.Base64URL.from(matchingKey.getX()))
                    .keyID(kid)
                    .build();

            JWSVerifier verifier = new Ed25519Verifier(okp);
            if (!jwsObject.verify(verifier)) {
                return new SignatureVerificationResult(false, null, "Signature verification failed");
            }

            HumanEffortClaim claim = objectMapper.readValue(
                    jwsObject.getPayload().toString(), HumanEffortClaim.class);

            if (!issuerDomain.equals(claim.getIss())) {
                return new SignatureVerificationResult(false, null,
                        "Issuer mismatch: expected " + issuerDomain + ", got " + claim.getIss());
            }

            return new SignatureVerificationResult(true, claim, null);

        } catch (Exception e) {
            return new SignatureVerificationResult(false, null, e.getMessage());
        }
    }

    /**
     * Extracts the HAP ID from a verification URL.
     *
     * @param url The verification URL (e.g., "https://ballista.io/v/hap_abc123xyz456")
     * @return The HAP ID or null if not found
     */
    public static String extractHapIdFromUrl(String url) {
        try {
            URI uri = new URI(url);
            String path = uri.getPath();
            String[] parts = path.split("/");
            if (parts.length > 0) {
                String lastPart = parts[parts.length - 1];
                if (isValidHapId(lastPart)) {
                    return lastPart;
                }
            }
        } catch (Exception e) {
            // Invalid URL
        }
        return null;
    }

    /**
     * Checks if a claim is expired.
     *
     * @param claim The HAP claim to check
     * @return true if the claim has an exp field and is expired
     */
    public static boolean isClaimExpired(HapClaim claim) {
        String exp = claim.getExp();
        if (exp == null || exp.isEmpty()) {
            return false;
        }
        try {
            Instant expInstant = Instant.parse(exp);
            return expInstant.isBefore(Instant.now());
        } catch (Exception e) {
            return false;
        }
    }

    /**
     * Checks if the claim target matches the expected company.
     *
     * @param claim The HAP claim to check
     * @param companyDomain The expected company domain
     * @return true if the claim's target domain matches
     */
    public static boolean isClaimForCompany(HumanEffortClaim claim, String companyDomain) {
        return claim.getTo() != null && companyDomain.equals(claim.getTo().getDomain());
    }

    /**
     * Checks if an employer commitment claim matches the expected company.
     *
     * @param claim The employer commitment claim to check
     * @param companyDomain The expected company domain
     * @return true if the claim's employer domain matches
     */
    public static boolean isClaimForCompany(EmployerCommitmentClaim claim, String companyDomain) {
        return claim.getEmployer() != null && companyDomain.equals(claim.getEmployer().getDomain());
    }

    /**
     * Result of signature verification.
     */
    public static class SignatureVerificationResult {
        private final boolean valid;
        private final HumanEffortClaim claim;
        private final String error;

        public SignatureVerificationResult(boolean valid, HumanEffortClaim claim, String error) {
            this.valid = valid;
            this.claim = claim;
            this.error = error;
        }

        public boolean isValid() { return valid; }
        public HumanEffortClaim getClaim() { return claim; }
        public String getError() { return error; }
    }
}
