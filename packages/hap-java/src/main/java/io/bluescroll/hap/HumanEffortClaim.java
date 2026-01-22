package io.bluescroll.hap;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Represents a human effort verification claim.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class HumanEffortClaim implements HapClaim {
    @JsonProperty("v")
    private String v;

    @JsonProperty("id")
    private String id;

    @JsonProperty("type")
    private String type = "human_effort";

    @JsonProperty("method")
    private String method;

    @JsonProperty("tier")
    private String tier;

    @JsonProperty("to")
    private ClaimTarget to;

    @JsonProperty("at")
    private String at;

    @JsonProperty("exp")
    private String exp;

    @JsonProperty("iss")
    private String iss;

    public HumanEffortClaim() {}

    public HumanEffortClaim(String method, String recipientName, String domain, String tier, String issuer) {
        this.v = Hap.VERSION;
        this.id = Hap.generateHapId();
        this.method = method;
        this.to = new ClaimTarget(recipientName, domain);
        this.tier = tier;
        this.at = java.time.Instant.now().toString();
        this.iss = issuer;
    }

    @Override public String getV() { return v; }
    @Override public String getId() { return id; }
    @Override public String getType() { return type; }
    @Override public String getAt() { return at; }
    @Override public String getExp() { return exp; }
    @Override public String getIss() { return iss; }

    public String getMethod() { return method; }
    public String getTier() { return tier; }
    public ClaimTarget getTo() { return to; }

    public void setV(String v) { this.v = v; }
    public void setId(String id) { this.id = id; }
    public void setType(String type) { this.type = type; }
    public void setMethod(String method) { this.method = method; }
    public void setTier(String tier) { this.tier = tier; }
    public void setTo(ClaimTarget to) { this.to = to; }
    public void setAt(String at) { this.at = at; }
    public void setExp(String exp) { this.exp = exp; }
    public void setIss(String iss) { this.iss = iss; }

    /**
     * Target recipient information.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ClaimTarget {
        @JsonProperty("name")
        private String name;

        @JsonProperty("domain")
        private String domain;

        public ClaimTarget() {}

        public ClaimTarget(String name, String domain) {
            this.name = name;
            this.domain = domain;
        }

        public String getName() { return name; }
        public String getDomain() { return domain; }
        public void setName(String name) { this.name = name; }
        public void setDomain(String domain) { this.domain = domain; }
    }
}
