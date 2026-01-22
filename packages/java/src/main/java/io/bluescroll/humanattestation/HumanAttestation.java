package io.bluescroll.humanattestation;

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
 * HAP (Human Attestation Protocol) SDK for Java.
 *
 * <p>HAP is an open standard for verified human effort. It enables Verification
 * Authorities (VAs) to cryptographically attest that a sender took deliberate,
 * costly action when communicating with a recipient.
 *
 * <p>Example - Verifying a claim (for recipients):
 * <pre>{@code
 * Claim claim = HumanAttestation.verifyClaim("hap_abc123xyz456", "ballista.jobs");
 * if (claim != null && !HumanAttestation.isClaimExpired(claim)) {
 *     System.out.println("Verified application to " + claim.getTo().getName());
 * }
 * }</pre>
 */
public class HumanAttestation {
    /** Protocol version */
    public static final String VERSION = "0.1";

    /** HAP Compact format version */
    public static final String COMPACT_VERSION = "1";

    /** HAP ID regex pattern */
    public static final Pattern ID_PATTERN = Pattern.compile("^hap_[a-zA-Z0-9]{12}$");

    /** Test HAP ID regex pattern */
    public static final Pattern TEST_ID_PATTERN = Pattern.compile("^hap_test_[a-zA-Z0-9]{8}$");

    /** HAP Compact format regex pattern (9 fields, no type) */
    public static final Pattern COMPACT_PATTERN = Pattern.compile(
            "^HAP1\\.hap_[a-zA-Z0-9_]+\\.[^.]+\\.[^.]+\\.[^.]*\\.\\d+\\.\\d+\\.[^.]+\\.[A-Za-z0-9_-]+$");

    /** Characters for HAP ID generation */
    private static final String ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    private static final ObjectMapper objectMapper = new ObjectMapper();
    private static final OkHttpClient httpClient = new OkHttpClient.Builder()
            .callTimeout(Duration.ofSeconds(10))
            .build();

    private HumanAttestation() {} // Utility class

    /**
     * Validates a HAP ID format.
     *
     * @param id The HAP ID to validate
     * @return true if the ID matches the format hap_[a-zA-Z0-9]{12}
     */
    public static boolean isValidId(String id) {
        return id != null && ID_PATTERN.matcher(id).matches();
    }

    /**
     * Generates a cryptographically secure random HAP ID.
     *
     * @return A HAP ID in the format hap_[a-zA-Z0-9]{12}
     */
    public static String generateId() {
        SecureRandom random = new SecureRandom();
        StringBuilder suffix = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            suffix.append(ID_CHARS.charAt(random.nextInt(ID_CHARS.length())));
        }
        return "hap_" + suffix;
    }

    /**
     * Generates a test HAP ID (for previews and development).
     *
     * @return A test HAP ID in the format hap_test_[a-zA-Z0-9]{8}
     */
    public static String generateTestId() {
        SecureRandom random = new SecureRandom();
        StringBuilder suffix = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            suffix.append(ID_CHARS.charAt(random.nextInt(ID_CHARS.length())));
        }
        return "hap_test_" + suffix;
    }

    /**
     * Checks if a HAP ID is a test ID.
     *
     * @param id The HAP ID to check
     * @return true if the ID is a test ID
     */
    public static boolean isTestId(String id) {
        return id != null && TEST_ID_PATTERN.matcher(id).matches();
    }

    /**
     * Computes SHA-256 hash of content with prefix.
     *
     * @param content The content to hash
     * @return Hash string in format "sha256:xxxxx"
     */
    public static String hashContent(String content) {
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(content.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hashBytes) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return "sha256:" + hexString;
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    /**
     * Fetches the public keys from a VA's well-known endpoint.
     *
     * @param issuerDomain The VA's domain (e.g., "ballista.jobs")
     * @return The VA's public key configuration
     * @throws IOException if the request fails
     */
    public static WellKnown fetchPublicKeys(String issuerDomain) throws IOException {
        String url = "https://" + issuerDomain + "/.well-known/hap.json";
        Request request = new Request.Builder()
                .url(url)
                .header("Accept", "application/json")
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            if (!response.isSuccessful()) {
                throw new IOException("Failed to fetch public keys: HTTP " + response.code());
            }
            return objectMapper.readValue(response.body().string(), WellKnown.class);
        }
    }

    /**
     * Fetches and verifies a HAP claim from a VA.
     *
     * @param hapId The HAP ID to verify
     * @param issuerDomain The VA's domain (e.g., "ballista.jobs")
     * @return The verification response from the VA
     * @throws IOException if the request fails
     */
    public static VerificationResponse fetchClaim(String hapId, String issuerDomain) throws IOException {
        if (!isValidId(hapId)) {
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
    public static Claim verifyClaim(String hapId, String issuerDomain) throws IOException {
        return verifyClaim(hapId, issuerDomain, true);
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
    public static Claim verifyClaim(String hapId, String issuerDomain, boolean verifySignature) throws IOException {
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

        return response.getClaim();
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
            WellKnown wellKnown = fetchPublicKeys(issuerDomain);

            JWSObject jwsObject = JWSObject.parse(jwsString);
            String kid = jwsObject.getHeader().getKeyID();

            if (kid == null) {
                return new SignatureVerificationResult(false, null, "JWS header missing kid");
            }

            WellKnown.Jwk matchingKey = null;
            for (WellKnown.Jwk key : wellKnown.getKeys()) {
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

            Claim claim = objectMapper.readValue(
                    jwsObject.getPayload().toString(), Claim.class);

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
     * @param url The verification URL (e.g., "https://www.ballista.jobs/v/hap_abc123xyz456")
     * @return The HAP ID or null if not found
     */
    public static String extractIdFromUrl(String url) {
        try {
            URI uri = new URI(url);
            String path = uri.getPath();
            String[] parts = path.split("/");
            if (parts.length > 0) {
                String lastPart = parts[parts.length - 1];
                if (isValidId(lastPart)) {
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
    public static boolean isClaimExpired(Claim claim) {
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
     * Checks if the claim target matches the expected recipient.
     *
     * @param claim The HAP claim to check
     * @param recipientDomain The expected recipient domain
     * @return true if the claim's target domain matches
     */
    public static boolean isClaimForRecipient(Claim claim, String recipientDomain) {
        return claim.getTo() != null && recipientDomain.equals(claim.getTo().getDomain());
    }

    /**
     * Result of signature verification.
     */
    public static class SignatureVerificationResult {
        private final boolean valid;
        private final Claim claim;
        private final String error;

        public SignatureVerificationResult(boolean valid, Claim claim, String error) {
            this.valid = valid;
            this.claim = claim;
            this.error = error;
        }

        public boolean isValid() { return valid; }
        public Claim getClaim() { return claim; }
        public String getError() { return error; }
    }
}
