package com.bluescroll.hap;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Represents a response from the verification API.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class VerificationResponse {
    @JsonProperty("valid")
    private boolean valid;

    @JsonProperty("id")
    private String id;

    @JsonProperty("claims")
    private HumanEffortClaim claims;

    @JsonProperty("jws")
    private String jws;

    @JsonProperty("issuer")
    private String issuer;

    @JsonProperty("verifyUrl")
    private String verifyUrl;

    @JsonProperty("revoked")
    private boolean revoked;

    @JsonProperty("revocationReason")
    private String revocationReason;

    @JsonProperty("revokedAt")
    private String revokedAt;

    @JsonProperty("error")
    private String error;

    public boolean isValid() { return valid; }
    public String getId() { return id; }
    public HumanEffortClaim getClaims() { return claims; }
    public String getJws() { return jws; }
    public String getIssuer() { return issuer; }
    public String getVerifyUrl() { return verifyUrl; }
    public boolean isRevoked() { return revoked; }
    public String getRevocationReason() { return revocationReason; }
    public String getRevokedAt() { return revokedAt; }
    public String getError() { return error; }

    public void setValid(boolean valid) { this.valid = valid; }
    public void setId(String id) { this.id = id; }
    public void setClaims(HumanEffortClaim claims) { this.claims = claims; }
    public void setJws(String jws) { this.jws = jws; }
    public void setIssuer(String issuer) { this.issuer = issuer; }
    public void setVerifyUrl(String verifyUrl) { this.verifyUrl = verifyUrl; }
    public void setRevoked(boolean revoked) { this.revoked = revoked; }
    public void setRevocationReason(String revocationReason) { this.revocationReason = revocationReason; }
    public void setRevokedAt(String revokedAt) { this.revokedAt = revokedAt; }
    public void setError(String error) { this.error = error; }
}
