using System.Text;
using System.Web;
using NSec.Cryptography;

namespace BlueScroll.Hap;

/// <summary>
/// HAP Compact Format utilities for space-efficient serialization.
///
/// Format: HAP{version}.{id}.{type}.{method}.{to_name}.{to_domain}.{at}.{exp}.{iss}.{signature}
///
/// Example:
/// HAP1.hap_abc123xyz456.human_effort.physical_mail.Acme%20Corp.acme%2Ecom.1706169600.1769241600.ballista%2Ejobs.MEUCIQDx...
/// </summary>
public static class HapCompact
{
    private static readonly DateTimeOffset UnixEpoch = new DateTimeOffset(1970, 1, 1, 0, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// Encodes a field for compact format (URL-encode + encode dots).
    /// </summary>
    private static string EncodeCompactField(string value)
    {
        return HttpUtility.UrlEncode(value ?? "").Replace(".", "%2E");
    }

    /// <summary>
    /// Decodes a compact format field.
    /// </summary>
    private static string DecodeCompactField(string value)
    {
        return HttpUtility.UrlDecode(value);
    }

    /// <summary>
    /// Convert ISO 8601 timestamp to Unix epoch seconds.
    /// </summary>
    private static long IsoToUnix(string iso)
    {
        var dt = DateTimeOffset.Parse(iso);
        return (long)(dt - UnixEpoch).TotalSeconds;
    }

    /// <summary>
    /// Convert Unix epoch seconds to ISO 8601 timestamp.
    /// </summary>
    private static string UnixToIso(long unix)
    {
        return UnixEpoch.AddSeconds(unix).ToString("O");
    }

    /// <summary>
    /// Get recipient info from a claim.
    /// </summary>
    private static (string Name, string Domain) GetRecipient(GenericClaim claim)
    {
        if (claim.Type == "recipient_commitment")
        {
            return (claim.Recipient?.Name ?? "", claim.Recipient?.Domain ?? "");
        }
        return (claim.To?.Name ?? "", claim.To?.Domain ?? "");
    }

    /// <summary>
    /// Get method from a claim.
    /// </summary>
    private static string GetMethod(GenericClaim claim)
    {
        if (claim.Type == "recipient_commitment")
        {
            return claim.Commitment ?? "";
        }
        return claim.Method ?? "";
    }

    /// <summary>
    /// Encodes a HAP claim and signature into compact format.
    /// </summary>
    /// <param name="claim">The claim to encode</param>
    /// <param name="signature">The Ed25519 signature bytes (64 bytes)</param>
    /// <returns>Compact format string</returns>
    public static string EncodeCompact(GenericClaim claim, byte[] signature)
    {
        var (name, domain) = GetRecipient(claim);
        var method = GetMethod(claim);

        var atUnix = IsoToUnix(claim.At);
        var expUnix = string.IsNullOrEmpty(claim.Exp) ? 0 : IsoToUnix(claim.Exp);

        return string.Join(".",
            $"HAP{Hap.CompactVersion}",
            claim.Id,
            claim.Type,
            method,
            EncodeCompactField(name),
            EncodeCompactField(domain),
            atUnix.ToString(),
            expUnix.ToString(),
            EncodeCompactField(claim.Iss),
            HapSigner.Base64UrlEncode(signature)
        );
    }

    /// <summary>
    /// Decodes a compact format string into claim and signature.
    /// </summary>
    /// <param name="compact">The compact format string</param>
    /// <returns>DecodedCompact with claim and signature</returns>
    /// <exception cref="ArgumentException">If format is invalid</exception>
    public static DecodedCompact DecodeCompact(string compact)
    {
        if (!Hap.IsValidCompact(compact))
        {
            throw new ArgumentException("Invalid HAP Compact format");
        }

        var parts = compact.Split('.');
        if (parts.Length != 10)
        {
            throw new ArgumentException($"Invalid HAP Compact format: expected 10 fields, got {parts.Length}");
        }

        var version = parts[0];
        var hapId = parts[1];
        var claimType = parts[2];
        var method = parts[3];
        var encodedName = parts[4];
        var encodedDomain = parts[5];
        var atUnixStr = parts[6];
        var expUnixStr = parts[7];
        var encodedIss = parts[8];
        var sigB64 = parts[9];

        if (version != $"HAP{Hap.CompactVersion}")
        {
            throw new ArgumentException($"Unsupported compact version: {version}");
        }

        var name = DecodeCompactField(encodedName);
        var domain = DecodeCompactField(encodedDomain);
        var iss = DecodeCompactField(encodedIss);
        var atUnix = long.Parse(atUnixStr);
        var expUnix = long.Parse(expUnixStr);
        var signature = HapSigner.Base64UrlDecode(sigB64);

        var at = UnixToIso(atUnix);
        var exp = expUnix != 0 ? UnixToIso(expUnix) : null;

        var claim = new GenericClaim
        {
            V = Hap.Version,
            Id = hapId,
            At = at,
            Iss = iss,
            Exp = exp
        };

        if (claimType == "recipient_commitment")
        {
            claim.Type = "recipient_commitment";
            claim.Recipient = new RecipientInfo { Name = name };
            if (!string.IsNullOrEmpty(domain))
            {
                claim.Recipient.Domain = domain;
            }
            claim.Commitment = method;
        }
        else
        {
            claim.Type = claimType;
            claim.Method = method;
            claim.To = new ClaimTarget { Name = name };
            if (!string.IsNullOrEmpty(domain))
            {
                claim.To.Domain = domain;
            }
        }

        return new DecodedCompact { Claim = claim, Signature = signature };
    }

    /// <summary>
    /// Builds the compact payload (everything before the signature).
    /// This is what gets signed.
    /// </summary>
    /// <param name="claim">The claim</param>
    /// <returns>Compact payload string</returns>
    public static string BuildCompactPayload(GenericClaim claim)
    {
        var (name, domain) = GetRecipient(claim);
        var method = GetMethod(claim);

        var atUnix = IsoToUnix(claim.At);
        var expUnix = string.IsNullOrEmpty(claim.Exp) ? 0 : IsoToUnix(claim.Exp);

        return string.Join(".",
            $"HAP{Hap.CompactVersion}",
            claim.Id,
            claim.Type,
            method,
            EncodeCompactField(name),
            EncodeCompactField(domain),
            atUnix.ToString(),
            expUnix.ToString(),
            EncodeCompactField(claim.Iss)
        );
    }

    /// <summary>
    /// Signs a claim and returns it in compact format.
    /// </summary>
    /// <param name="claim">The claim to sign</param>
    /// <param name="privateKey">The Ed25519 private key</param>
    /// <returns>Signed compact format string</returns>
    public static string SignCompact(GenericClaim claim, Key privateKey)
    {
        var payload = BuildCompactPayload(claim);
        var payloadBytes = Encoding.UTF8.GetBytes(payload);

        var algorithm = SignatureAlgorithm.Ed25519;
        var signature = algorithm.Sign(privateKey, payloadBytes);

        return $"{payload}.{HapSigner.Base64UrlEncode(signature)}";
    }

    /// <summary>
    /// Verifies a compact format string using provided public keys.
    /// </summary>
    /// <param name="compact">The compact format string</param>
    /// <param name="publicKeys">Array of JWK public keys to try</param>
    /// <returns>CompactVerificationResult</returns>
    public static CompactVerificationResult VerifyCompact(string compact, IEnumerable<HapJwk> publicKeys)
    {
        if (!Hap.IsValidCompact(compact))
        {
            return new CompactVerificationResult { Valid = false, Error = "Invalid compact format" };
        }

        try
        {
            // Split to get payload and signature
            var lastDot = compact.LastIndexOf('.');
            var payload = compact[..lastDot];
            var sigB64 = compact[(lastDot + 1)..];
            var signature = HapSigner.Base64UrlDecode(sigB64);
            var payloadBytes = Encoding.UTF8.GetBytes(payload);

            var algorithm = SignatureAlgorithm.Ed25519;

            // Try each public key
            foreach (var jwk in publicKeys)
            {
                try
                {
                    var xBytes = HapSigner.Base64UrlDecode(jwk.X);
                    var publicKey = PublicKey.Import(algorithm, xBytes, KeyBlobFormat.RawPublicKey);

                    // Verify signature
                    if (algorithm.Verify(publicKey, payloadBytes, signature))
                    {
                        var decoded = DecodeCompact(compact);
                        return new CompactVerificationResult { Valid = true, Claim = decoded.Claim };
                    }
                }
                catch
                {
                    // Try next key
                    continue;
                }
            }

            return new CompactVerificationResult { Valid = false, Error = "Signature verification failed" };
        }
        catch (Exception e)
        {
            return new CompactVerificationResult { Valid = false, Error = e.Message };
        }
    }

    /// <summary>
    /// Generates a verification URL with embedded compact claim.
    /// </summary>
    /// <param name="baseUrl">Base verification URL (e.g., "https://ballista.jobs/v")</param>
    /// <param name="compact">The compact format string</param>
    /// <returns>URL with compact claim in query parameter</returns>
    public static string GenerateVerificationUrl(string baseUrl, string compact)
    {
        return $"{baseUrl}?c={HttpUtility.UrlEncode(compact)}";
    }

    /// <summary>
    /// Extracts compact claim from a verification URL.
    /// </summary>
    /// <param name="url">The verification URL</param>
    /// <returns>Compact string or null if not found</returns>
    public static string? ExtractCompactFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var query = HttpUtility.ParseQueryString(uri.Query);
            var compact = query["c"];

            if (!string.IsNullOrEmpty(compact) && Hap.IsValidCompact(compact))
            {
                return compact;
            }

            return null;
        }
        catch
        {
            return null;
        }
    }
}
