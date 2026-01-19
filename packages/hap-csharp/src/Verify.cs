using System.Text;
using System.Text.Json;
using NSec.Cryptography;

namespace BlueScroll.Hap;

/// <summary>
/// HAP claim verification functions.
/// </summary>
public class HapVerifier : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly bool _ownsHttpClient;

    /// <summary>
    /// Creates a new HAP verifier.
    /// </summary>
    /// <param name="httpClient">Optional HTTP client to use</param>
    public HapVerifier(HttpClient? httpClient = null)
    {
        if (httpClient != null)
        {
            _httpClient = httpClient;
            _ownsHttpClient = false;
        }
        else
        {
            _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };
            _ownsHttpClient = true;
        }
    }

    /// <summary>
    /// Fetches the public keys from a VA's well-known endpoint.
    /// </summary>
    /// <param name="issuerDomain">The VA's domain (e.g., "ballista.io")</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The VA's public key configuration</returns>
    public async Task<HapWellKnown> FetchPublicKeysAsync(string issuerDomain, CancellationToken cancellationToken = default)
    {
        var url = $"https://{issuerDomain}/.well-known/hap.json";
        var response = await _httpClient.GetStringAsync(url, cancellationToken);
        return JsonSerializer.Deserialize<HapWellKnown>(response) ?? new HapWellKnown();
    }

    /// <summary>
    /// Fetches and verifies a HAP claim from a VA.
    /// </summary>
    /// <param name="hapId">The HAP ID to verify</param>
    /// <param name="issuerDomain">The VA's domain</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The verification response from the VA</returns>
    public async Task<VerificationResponse> FetchClaimAsync(string hapId, string issuerDomain, CancellationToken cancellationToken = default)
    {
        if (!Hap.IsValidHapId(hapId))
        {
            return new VerificationResponse { Valid = false, Error = "invalid_format" };
        }

        var url = $"https://{issuerDomain}/api/v1/verify/{hapId}";
        var response = await _httpClient.GetStringAsync(url, cancellationToken);
        return JsonSerializer.Deserialize<VerificationResponse>(response) ?? new VerificationResponse();
    }

    /// <summary>
    /// Verifies a JWS signature against a VA's public keys.
    /// </summary>
    /// <param name="jws">The JWS compact serialization string</param>
    /// <param name="issuerDomain">The VA's domain to fetch public keys from</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Verification result with decoded claim if valid</returns>
    public async Task<SignatureVerificationResult> VerifySignatureAsync(string jws, string issuerDomain, CancellationToken cancellationToken = default)
    {
        try
        {
            var wellKnown = await FetchPublicKeysAsync(issuerDomain, cancellationToken);

            var parts = jws.Split('.');
            if (parts.Length != 3)
            {
                return new SignatureVerificationResult { Valid = false, Error = "Invalid JWS format" };
            }

            var headerJson = Base64UrlDecode(parts[0]);
            var header = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(headerJson);
            var kid = header?.GetValueOrDefault("kid").GetString();

            if (string.IsNullOrEmpty(kid))
            {
                return new SignatureVerificationResult { Valid = false, Error = "JWS header missing kid" };
            }

            var jwk = wellKnown.Keys.FirstOrDefault(k => k.Kid == kid);
            if (jwk == null)
            {
                return new SignatureVerificationResult { Valid = false, Error = $"Key not found: {kid}" };
            }

            // Decode the public key
            var publicKeyBytes = Base64UrlDecodeBytes(jwk.X);
            var algorithm = SignatureAlgorithm.Ed25519;
            var publicKey = PublicKey.Import(algorithm, publicKeyBytes, KeyBlobFormat.RawPublicKey);

            // Verify the signature
            var signingInput = Encoding.ASCII.GetBytes($"{parts[0]}.{parts[1]}");
            var signature = Base64UrlDecodeBytes(parts[2]);

            if (!algorithm.Verify(publicKey, signingInput, signature))
            {
                return new SignatureVerificationResult { Valid = false, Error = "Signature verification failed" };
            }

            // Decode the payload
            var payloadJson = Base64UrlDecode(parts[1]);
            var claim = JsonSerializer.Deserialize<HumanEffortClaim>(payloadJson);

            if (claim?.Iss != issuerDomain)
            {
                return new SignatureVerificationResult
                {
                    Valid = false,
                    Error = $"Issuer mismatch: expected {issuerDomain}, got {claim?.Iss}"
                };
            }

            return new SignatureVerificationResult { Valid = true, Claim = claim };
        }
        catch (Exception ex)
        {
            return new SignatureVerificationResult { Valid = false, Error = ex.Message };
        }
    }

    /// <summary>
    /// Fully verifies a HAP claim: fetches from VA and optionally verifies signature.
    /// </summary>
    /// <param name="hapId">The HAP ID to verify</param>
    /// <param name="issuerDomain">The VA's domain</param>
    /// <param name="verifySignature">Whether to verify the cryptographic signature</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>The claim if valid, null if not found or invalid</returns>
    public async Task<HumanEffortClaim?> VerifyHapClaimAsync(
        string hapId,
        string issuerDomain,
        bool verifySignature = true,
        CancellationToken cancellationToken = default)
    {
        var response = await FetchClaimAsync(hapId, issuerDomain, cancellationToken);

        if (!response.Valid)
        {
            return null;
        }

        if (verifySignature && !string.IsNullOrEmpty(response.Jws))
        {
            var sigResult = await VerifySignatureAsync(response.Jws, issuerDomain, cancellationToken);
            if (!sigResult.Valid)
            {
                return null;
            }
        }

        return response.Claims;
    }

    /// <summary>
    /// Extracts the HAP ID from a verification URL.
    /// </summary>
    /// <param name="url">The verification URL</param>
    /// <returns>The HAP ID or null if not found</returns>
    public static string? ExtractHapIdFromUrl(string url)
    {
        try
        {
            var uri = new Uri(url);
            var parts = uri.AbsolutePath.Split('/');
            var lastPart = parts.LastOrDefault();

            return Hap.IsValidHapId(lastPart ?? "") ? lastPart : null;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>
    /// Checks if a claim is expired.
    /// </summary>
    /// <param name="claim">The HAP claim to check</param>
    /// <returns>true if the claim has an exp field and is expired</returns>
    public static bool IsClaimExpired(HapClaim claim)
    {
        if (string.IsNullOrEmpty(claim.Exp))
        {
            return false;
        }

        try
        {
            var expTime = DateTime.Parse(claim.Exp).ToUniversalTime();
            return expTime < DateTime.UtcNow;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>
    /// Checks if the claim target matches the expected company.
    /// </summary>
    /// <param name="claim">The HAP claim to check</param>
    /// <param name="companyDomain">The expected company domain</param>
    /// <returns>true if the claim's target domain matches</returns>
    public static bool IsClaimForCompany(HumanEffortClaim claim, string companyDomain)
    {
        return claim.To?.Domain == companyDomain;
    }

    /// <summary>
    /// Checks if an employer commitment claim matches the expected company.
    /// </summary>
    /// <param name="claim">The employer commitment claim to check</param>
    /// <param name="companyDomain">The expected company domain</param>
    /// <returns>true if the claim's employer domain matches</returns>
    public static bool IsClaimForCompany(EmployerCommitmentClaim claim, string companyDomain)
    {
        return claim.Employer?.Domain == companyDomain;
    }

    private static string Base64UrlDecode(string input)
    {
        return Encoding.UTF8.GetString(Base64UrlDecodeBytes(input));
    }

    private static byte[] Base64UrlDecodeBytes(string input)
    {
        var output = input.Replace('-', '+').Replace('_', '/');
        switch (output.Length % 4)
        {
            case 2: output += "=="; break;
            case 3: output += "="; break;
        }
        return Convert.FromBase64String(output);
    }

    public void Dispose()
    {
        if (_ownsHttpClient)
        {
            _httpClient.Dispose();
        }
    }
}
