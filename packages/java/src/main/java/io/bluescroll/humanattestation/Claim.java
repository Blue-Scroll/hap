package io.bluescroll.humanattestation;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Represents a HAP claim with effort dimensions.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class Claim {
    @JsonProperty("v")
    private String v;

    @JsonProperty("id")
    private String id;

    @JsonProperty("to")
    private ClaimTarget to;

    @JsonProperty("at")
    private String at;

    @JsonProperty("iss")
    private String iss;

    @JsonProperty("method")
    private String method;

    @JsonProperty("description")
    private String description;

    @JsonProperty("exp")
    private String exp;

    @JsonProperty("tier")
    private String tier;

    @JsonProperty("cost")
    private ClaimCost cost;

    @JsonProperty("time")
    private Integer time;  // seconds

    @JsonProperty("physical")
    private Boolean physical;

    @JsonProperty("energy")
    private Integer energy;  // kilocalories

    public Claim() {}

    public Claim(String method, String description, String recipientName, String domain, String tier, String issuer) {
        this.v = HumanAttestation.VERSION;
        this.id = HumanAttestation.generateId();
        this.method = method;
        this.description = description;
        this.to = new ClaimTarget(recipientName, domain);
        this.tier = tier;
        this.at = java.time.Instant.now().toString();
        this.iss = issuer;
    }

    public String getV() { return v; }
    public String getId() { return id; }
    public ClaimTarget getTo() { return to; }
    public String getAt() { return at; }
    public String getIss() { return iss; }
    public String getMethod() { return method; }
    public String getDescription() { return description; }
    public String getExp() { return exp; }
    public String getTier() { return tier; }
    public ClaimCost getCost() { return cost; }
    public Integer getTime() { return time; }
    public Boolean getPhysical() { return physical; }
    public Integer getEnergy() { return energy; }

    public void setV(String v) { this.v = v; }
    public void setId(String id) { this.id = id; }
    public void setTo(ClaimTarget to) { this.to = to; }
    public void setAt(String at) { this.at = at; }
    public void setIss(String iss) { this.iss = iss; }
    public void setMethod(String method) { this.method = method; }
    public void setDescription(String description) { this.description = description; }
    public void setExp(String exp) { this.exp = exp; }
    public void setTier(String tier) { this.tier = tier; }
    public void setCost(ClaimCost cost) { this.cost = cost; }
    public void setTime(Integer time) { this.time = time; }
    public void setPhysical(Boolean physical) { this.physical = physical; }
    public void setEnergy(Integer energy) { this.energy = energy; }

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

    /**
     * Monetary cost.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ClaimCost {
        @JsonProperty("amount")
        private int amount;  // Smallest currency unit (cents)

        @JsonProperty("currency")
        private String currency;  // ISO 4217

        public ClaimCost() {}

        public ClaimCost(int amount, String currency) {
            this.amount = amount;
            this.currency = currency;
        }

        public int getAmount() { return amount; }
        public String getCurrency() { return currency; }
        public void setAmount(int amount) { this.amount = amount; }
        public void setCurrency(String currency) { this.currency = currency; }
    }
}
