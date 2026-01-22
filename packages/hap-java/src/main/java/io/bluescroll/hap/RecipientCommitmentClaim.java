package io.bluescroll.hap;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Represents a recipient commitment claim.
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public class RecipientCommitmentClaim implements HapClaim {
    @JsonProperty("v")
    private String v;

    @JsonProperty("id")
    private String id;

    @JsonProperty("type")
    private String type = "recipient_commitment";

    @JsonProperty("recipient")
    private RecipientInfo recipient;

    @JsonProperty("commitment")
    private String commitment;

    @JsonProperty("at")
    private String at;

    @JsonProperty("exp")
    private String exp;

    @JsonProperty("iss")
    private String iss;

    public RecipientCommitmentClaim() {}

    public RecipientCommitmentClaim(String recipientName, String recipientDomain, String commitment, String issuer) {
        this.v = Hap.VERSION;
        this.id = Hap.generateHapId();
        this.recipient = new RecipientInfo(recipientName, recipientDomain);
        this.commitment = commitment;
        this.at = java.time.Instant.now().toString();
        this.iss = issuer;
    }

    @Override public String getV() { return v; }
    @Override public String getId() { return id; }
    @Override public String getType() { return type; }
    @Override public String getAt() { return at; }
    @Override public String getExp() { return exp; }
    @Override public String getIss() { return iss; }

    public RecipientInfo getRecipient() { return recipient; }
    public String getCommitment() { return commitment; }

    public void setV(String v) { this.v = v; }
    public void setId(String id) { this.id = id; }
    public void setType(String type) { this.type = type; }
    public void setRecipient(RecipientInfo recipient) { this.recipient = recipient; }
    public void setCommitment(String commitment) { this.commitment = commitment; }
    public void setAt(String at) { this.at = at; }
    public void setExp(String exp) { this.exp = exp; }
    public void setIss(String iss) { this.iss = iss; }

    /**
     * Recipient information.
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class RecipientInfo {
        @JsonProperty("name")
        private String name;

        @JsonProperty("domain")
        private String domain;

        public RecipientInfo() {}

        public RecipientInfo(String name, String domain) {
            this.name = name;
            this.domain = domain;
        }

        public String getName() { return name; }
        public String getDomain() { return domain; }
        public void setName(String name) { this.name = name; }
        public void setDomain(String domain) { this.domain = domain; }
    }
}
