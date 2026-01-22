package io.bluescroll.hap;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Base interface for HAP claims.
 */
@JsonTypeInfo(
    use = JsonTypeInfo.Id.NAME,
    include = JsonTypeInfo.As.PROPERTY,
    property = "type"
)
@JsonSubTypes({
    @JsonSubTypes.Type(value = HumanEffortClaim.class, name = "human_effort"),
    @JsonSubTypes.Type(value = RecipientCommitmentClaim.class, name = "recipient_commitment")
})
@JsonIgnoreProperties(ignoreUnknown = true)
public interface HapClaim {
    String getV();
    String getId();
    String getType();
    String getAt();
    String getExp();
    String getIss();
}
