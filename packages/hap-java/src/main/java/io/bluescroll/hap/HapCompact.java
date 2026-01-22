package io.bluescroll.hap;

import com.nimbusds.jose.jwk.OctetKeyPair;
import com.nimbusds.jose.util.Base64URL;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.Signature;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.Base64;

/**
 * HAP Compact Format utilities for space-efficient serialization.
 *
 * <p>Format: HAP{version}.{id}.{type}.{method}.{to_name}.{to_domain}.{at}.{exp}.{iss}.{signature}
 *
 * <p>Example:
 * HAP1.hap_abc123xyz456.human_effort.physical_mail.Acme%20Corp.acme%2Ecom.1706169600.1769241600.ballista%2Ejobs.MEUCIQDx...
 */
public class HapCompact {

    private HapCompact() {} // Utility class

    /**
     * Encodes a field for compact format (URL-encode + encode dots).
     */
    private static String encodeCompactField(String value) {
        if (value == null) return "";
        String encoded = URLEncoder.encode(value, StandardCharsets.UTF_8);
        return encoded.replace(".", "%2E");
    }

    /**
     * Decodes a compact format field.
     */
    private static String decodeCompactField(String value) {
        return URLDecoder.decode(value, StandardCharsets.UTF_8);
    }

    /**
     * Base64url encode without padding.
     */
    private static String base64urlEncode(byte[] data) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(data);
    }

    /**
     * Base64url decode.
     */
    private static byte[] base64urlDecode(String data) {
        return Base64.getUrlDecoder().decode(data);
    }

    /**
     * Convert ISO 8601 timestamp to Unix epoch seconds.
     */
    private static long isoToUnix(String iso) {
        return Instant.parse(iso).getEpochSecond();
    }

    /**
     * Convert Unix epoch seconds to ISO 8601 timestamp.
     */
    private static String unixToIso(long unix) {
        return Instant.ofEpochSecond(unix)
                .atOffset(ZoneOffset.UTC)
                .format(DateTimeFormatter.ISO_INSTANT);
    }

    /**
     * Encodes a HAP claim and signature into compact format.
     *
     * @param claim The generic claim to encode
     * @param signature The Ed25519 signature bytes (64 bytes)
     * @return Compact format string
     */
    public static String encodeCompact(GenericClaim claim, byte[] signature) {
        String name, domain, method;

        if ("recipient_commitment".equals(claim.getType())) {
            name = claim.getRecipient() != null ? claim.getRecipient().getName() : "";
            domain = claim.getRecipient() != null ? claim.getRecipient().getDomain() : "";
            method = claim.getCommitment();
        } else {
            name = claim.getTo() != null ? claim.getTo().getName() : "";
            domain = claim.getTo() != null ? claim.getTo().getDomain() : "";
            method = claim.getMethod();
        }

        long atUnix = isoToUnix(claim.getAt());
        long expUnix = claim.getExp() != null && !claim.getExp().isEmpty() ? isoToUnix(claim.getExp()) : 0;

        return String.join(".",
                "HAP" + Hap.COMPACT_VERSION,
                claim.getId(),
                claim.getType(),
                method != null ? method : "",
                encodeCompactField(name != null ? name : ""),
                encodeCompactField(domain != null ? domain : ""),
                String.valueOf(atUnix),
                String.valueOf(expUnix),
                encodeCompactField(claim.getIss()),
                base64urlEncode(signature)
        );
    }

    /**
     * Decodes a compact format string into claim and signature.
     *
     * @param compact The compact format string
     * @return DecodedCompact with claim and signature
     * @throws IllegalArgumentException if format is invalid
     */
    public static DecodedCompact decodeCompact(String compact) {
        if (!isValidCompact(compact)) {
            throw new IllegalArgumentException("Invalid HAP Compact format");
        }

        String[] parts = compact.split("\\.");
        if (parts.length != 10) {
            throw new IllegalArgumentException("Invalid HAP Compact format: expected 10 fields, got " + parts.length);
        }

        String version = parts[0];
        String hapId = parts[1];
        String claimType = parts[2];
        String method = parts[3];
        String encodedName = parts[4];
        String encodedDomain = parts[5];
        String atUnixStr = parts[6];
        String expUnixStr = parts[7];
        String encodedIss = parts[8];
        String sigB64 = parts[9];

        if (!("HAP" + Hap.COMPACT_VERSION).equals(version)) {
            throw new IllegalArgumentException("Unsupported compact version: " + version);
        }

        String name = decodeCompactField(encodedName);
        String domain = decodeCompactField(encodedDomain);
        String iss = decodeCompactField(encodedIss);
        long atUnix = Long.parseLong(atUnixStr);
        long expUnix = Long.parseLong(expUnixStr);
        byte[] signature = base64urlDecode(sigB64);

        String at = unixToIso(atUnix);
        String exp = expUnix != 0 ? unixToIso(expUnix) : null;

        GenericClaim claim = new GenericClaim();
        claim.setV(Hap.VERSION);
        claim.setId(hapId);
        claim.setAt(at);
        claim.setIss(iss);
        claim.setExp(exp);

        if ("recipient_commitment".equals(claimType)) {
            claim.setType("recipient_commitment");
            GenericClaim.RecipientInfo recipient = new GenericClaim.RecipientInfo();
            recipient.setName(name);
            if (domain != null && !domain.isEmpty()) {
                recipient.setDomain(domain);
            }
            claim.setRecipient(recipient);
            claim.setCommitment(method);
        } else {
            claim.setType(claimType);
            claim.setMethod(method);
            GenericClaim.ClaimTarget to = new GenericClaim.ClaimTarget();
            to.setName(name);
            if (domain != null && !domain.isEmpty()) {
                to.setDomain(domain);
            }
            claim.setTo(to);
        }

        return new DecodedCompact(claim, signature);
    }

    /**
     * Validates if a string is a valid HAP Compact format.
     *
     * @param compact The string to validate
     * @return true if valid compact format
     */
    public static boolean isValidCompact(String compact) {
        return compact != null && Hap.HAP_COMPACT_PATTERN.matcher(compact).matches();
    }

    /**
     * Builds the compact payload (everything before the signature).
     * This is what gets signed.
     *
     * @param claim The generic claim
     * @return Compact payload string
     */
    public static String buildCompactPayload(GenericClaim claim) {
        String name, domain, method;

        if ("recipient_commitment".equals(claim.getType())) {
            name = claim.getRecipient() != null ? claim.getRecipient().getName() : "";
            domain = claim.getRecipient() != null ? claim.getRecipient().getDomain() : "";
            method = claim.getCommitment();
        } else {
            name = claim.getTo() != null ? claim.getTo().getName() : "";
            domain = claim.getTo() != null ? claim.getTo().getDomain() : "";
            method = claim.getMethod();
        }

        long atUnix = isoToUnix(claim.getAt());
        long expUnix = claim.getExp() != null && !claim.getExp().isEmpty() ? isoToUnix(claim.getExp()) : 0;

        return String.join(".",
                "HAP" + Hap.COMPACT_VERSION,
                claim.getId(),
                claim.getType(),
                method != null ? method : "",
                encodeCompactField(name != null ? name : ""),
                encodeCompactField(domain != null ? domain : ""),
                String.valueOf(atUnix),
                String.valueOf(expUnix),
                encodeCompactField(claim.getIss())
        );
    }

    /**
     * Signs a claim and returns it in compact format.
     *
     * @param claim The generic claim to sign
     * @param keyPair The Ed25519 key pair
     * @return Signed compact format string
     * @throws Exception if signing fails
     */
    public static String signCompact(GenericClaim claim, OctetKeyPair keyPair) throws Exception {
        String payload = buildCompactPayload(claim);
        byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);

        // Get the private key bytes
        byte[] privateKeyBytes = keyPair.getD().decode();
        byte[] publicKeyBytes = keyPair.getX().decode();

        // Combine to form Ed25519 seed (private + public = 64 bytes for Java Ed25519)
        byte[] fullPrivateKey = new byte[64];
        System.arraycopy(privateKeyBytes, 0, fullPrivateKey, 0, 32);
        System.arraycopy(publicKeyBytes, 0, fullPrivateKey, 32, 32);

        java.security.KeyFactory kf = java.security.KeyFactory.getInstance("Ed25519");
        java.security.spec.PKCS8EncodedKeySpec keySpec =
            new java.security.spec.PKCS8EncodedKeySpec(wrapEd25519PrivateKey(privateKeyBytes));
        java.security.PrivateKey privateKey = kf.generatePrivate(keySpec);

        Signature sig = Signature.getInstance("Ed25519");
        sig.initSign(privateKey);
        sig.update(payloadBytes);
        byte[] signature = sig.sign();

        return payload + "." + base64urlEncode(signature);
    }

    /**
     * Wraps Ed25519 private key bytes in PKCS#8 format.
     */
    private static byte[] wrapEd25519PrivateKey(byte[] rawKey) {
        // PKCS#8 header for Ed25519 private key
        byte[] header = new byte[] {
            0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
            0x04, 0x22, 0x04, 0x20
        };
        byte[] result = new byte[header.length + rawKey.length];
        System.arraycopy(header, 0, result, 0, header.length);
        System.arraycopy(rawKey, 0, result, header.length, rawKey.length);
        return result;
    }

    /**
     * Verifies a compact format string using provided public keys.
     *
     * @param compact The compact format string
     * @param publicKeys Array of JWK public keys to try
     * @return CompactVerificationResult
     */
    public static CompactVerificationResult verifyCompact(String compact, HapWellKnown.HapJwk[] publicKeys) {
        if (!isValidCompact(compact)) {
            return new CompactVerificationResult(false, null, "Invalid compact format");
        }

        try {
            // Split to get payload and signature
            int lastDot = compact.lastIndexOf('.');
            String payload = compact.substring(0, lastDot);
            String sigB64 = compact.substring(lastDot + 1);
            byte[] signature = base64urlDecode(sigB64);
            byte[] payloadBytes = payload.getBytes(StandardCharsets.UTF_8);

            // Try each public key
            for (HapWellKnown.HapJwk jwk : publicKeys) {
                try {
                    byte[] publicKeyBytes = Base64URL.from(jwk.getX()).decode();

                    // Wrap in X.509 format
                    byte[] x509Key = wrapEd25519PublicKey(publicKeyBytes);
                    java.security.KeyFactory kf = java.security.KeyFactory.getInstance("Ed25519");
                    java.security.spec.X509EncodedKeySpec keySpec =
                        new java.security.spec.X509EncodedKeySpec(x509Key);
                    java.security.PublicKey publicKey = kf.generatePublic(keySpec);

                    Signature sig = Signature.getInstance("Ed25519");
                    sig.initVerify(publicKey);
                    sig.update(payloadBytes);

                    if (sig.verify(signature)) {
                        DecodedCompact decoded = decodeCompact(compact);
                        return new CompactVerificationResult(true, decoded.getClaim(), null);
                    }
                } catch (Exception e) {
                    // Try next key
                    continue;
                }
            }

            return new CompactVerificationResult(false, null, "Signature verification failed");
        } catch (Exception e) {
            return new CompactVerificationResult(false, null, e.getMessage());
        }
    }

    /**
     * Wraps Ed25519 public key bytes in X.509 format.
     */
    private static byte[] wrapEd25519PublicKey(byte[] rawKey) {
        // X.509 header for Ed25519 public key
        byte[] header = new byte[] {
            0x30, 0x2a, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x03, 0x21, 0x00
        };
        byte[] result = new byte[header.length + rawKey.length];
        System.arraycopy(header, 0, result, 0, header.length);
        System.arraycopy(rawKey, 0, result, header.length, rawKey.length);
        return result;
    }

    /**
     * Generates a verification URL with embedded compact claim.
     *
     * @param baseUrl Base verification URL (e.g., "https://ballista.jobs/v")
     * @param compact The compact format string
     * @return URL with compact claim in query parameter
     */
    public static String generateVerificationUrl(String baseUrl, String compact) {
        return baseUrl + "?c=" + URLEncoder.encode(compact, StandardCharsets.UTF_8);
    }

    /**
     * Extracts compact claim from a verification URL.
     *
     * @param url The verification URL
     * @return Compact string or null if not found
     */
    public static String extractCompactFromUrl(String url) {
        try {
            java.net.URI uri = new java.net.URI(url);
            String query = uri.getQuery();
            if (query == null) return null;

            for (String param : query.split("&")) {
                String[] pair = param.split("=", 2);
                if (pair.length == 2 && "c".equals(pair[0])) {
                    String compact = URLDecoder.decode(pair[1], StandardCharsets.UTF_8);
                    if (isValidCompact(compact)) {
                        return compact;
                    }
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Decoded compact format result.
     */
    public static class DecodedCompact {
        private final GenericClaim claim;
        private final byte[] signature;

        public DecodedCompact(GenericClaim claim, byte[] signature) {
            this.claim = claim;
            this.signature = signature;
        }

        public GenericClaim getClaim() { return claim; }
        public byte[] getSignature() { return signature; }
    }

    /**
     * Compact verification result.
     */
    public static class CompactVerificationResult {
        private final boolean valid;
        private final GenericClaim claim;
        private final String error;

        public CompactVerificationResult(boolean valid, GenericClaim claim, String error) {
            this.valid = valid;
            this.claim = claim;
            this.error = error;
        }

        public boolean isValid() { return valid; }
        public GenericClaim getClaim() { return claim; }
        public String getError() { return error; }
    }

    /**
     * Generic claim for compact format support.
     */
    public static class GenericClaim implements HapClaim {
        private String v;
        private String id;
        private String type;
        private String method;
        private String tier;
        private ClaimTarget to;
        private RecipientInfo recipient;
        private String commitment;
        private String at;
        private String exp;
        private String iss;

        @Override public String getV() { return v; }
        @Override public String getId() { return id; }
        @Override public String getType() { return type; }
        @Override public String getAt() { return at; }
        @Override public String getExp() { return exp; }
        @Override public String getIss() { return iss; }

        public String getMethod() { return method; }
        public String getTier() { return tier; }
        public ClaimTarget getTo() { return to; }
        public RecipientInfo getRecipient() { return recipient; }
        public String getCommitment() { return commitment; }

        public void setV(String v) { this.v = v; }
        public void setId(String id) { this.id = id; }
        public void setType(String type) { this.type = type; }
        public void setMethod(String method) { this.method = method; }
        public void setTier(String tier) { this.tier = tier; }
        public void setTo(ClaimTarget to) { this.to = to; }
        public void setRecipient(RecipientInfo recipient) { this.recipient = recipient; }
        public void setCommitment(String commitment) { this.commitment = commitment; }
        public void setAt(String at) { this.at = at; }
        public void setExp(String exp) { this.exp = exp; }
        public void setIss(String iss) { this.iss = iss; }

        public static class ClaimTarget {
            private String name;
            private String domain;

            public String getName() { return name; }
            public String getDomain() { return domain; }
            public void setName(String name) { this.name = name; }
            public void setDomain(String domain) { this.domain = domain; }
        }

        public static class RecipientInfo {
            private String name;
            private String domain;

            public String getName() { return name; }
            public String getDomain() { return domain; }
            public void setName(String name) { this.name = name; }
            public void setDomain(String domain) { this.domain = domain; }
        }
    }
}
