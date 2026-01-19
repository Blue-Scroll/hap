package io.bluescroll.hap;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Represents the response from /.well-known/hap.json.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class HapWellKnown {
    @JsonProperty("issuer")
    private String issuer;

    @JsonProperty("keys")
    private List<HapJwk> keys;

    public String getIssuer() { return issuer; }
    public List<HapJwk> getKeys() { return keys; }

    public void setIssuer(String issuer) { this.issuer = issuer; }
    public void setKeys(List<HapJwk> keys) { this.keys = keys; }

    /**
     * Represents a JWK public key for Ed25519.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class HapJwk {
        @JsonProperty("kid")
        private String kid;

        @JsonProperty("kty")
        private String kty;

        @JsonProperty("crv")
        private String crv;

        @JsonProperty("x")
        private String x;

        public String getKid() { return kid; }
        public String getKty() { return kty; }
        public String getCrv() { return crv; }
        public String getX() { return x; }

        public void setKid(String kid) { this.kid = kid; }
        public void setKty(String kty) { this.kty = kty; }
        public void setCrv(String crv) { this.crv = crv; }
        public void setX(String x) { this.x = x; }
    }
}
