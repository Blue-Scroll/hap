using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace BlueScroll.Hap;

/// <summary>
/// HAP (Human Attestation Protocol) SDK for .NET.
///
/// HAP is an open standard for verified human effort. It enables Verification
/// Authorities (VAs) to cryptographically attest that a sender took deliberate,
/// costly action when communicating with a recipient.
/// </summary>
public static partial class Hap
{
    /// <summary>Protocol version</summary>
    public const string Version = "0.1";

    /// <summary>HAP Compact format version</summary>
    public const string CompactVersion = "1";

    /// <summary>Characters for HAP ID generation</summary>
    private const string HapIdChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    /// <summary>HAP ID regex pattern</summary>
    [GeneratedRegex(@"^hap_[a-zA-Z0-9]{12}$")]
    private static partial Regex HapIdRegex();

    /// <summary>Test HAP ID regex pattern</summary>
    [GeneratedRegex(@"^hap_test_[a-zA-Z0-9]{8}$")]
    private static partial Regex HapTestIdRegex();

    /// <summary>HAP Compact format regex pattern</summary>
    [GeneratedRegex(@"^HAP1\.hap_[a-zA-Z0-9_]+\.[a-z_]+\.[a-z_]+\.[^.]+\.[^.]*\.\d+\.\d+\.[^.]+\.[A-Za-z0-9_-]+$")]
    private static partial Regex HapCompactRegex();

    /// <summary>Claim types</summary>
    public static class ClaimTypes
    {
        public const string HumanEffort = "human_effort";
        public const string RecipientCommitment = "recipient_commitment";
        public const string PhysicalDelivery = "physical_delivery";
        public const string FinancialCommitment = "financial_commitment";
        public const string ContentAttestation = "content_attestation";
    }

    /// <summary>Core verification methods</summary>
    public static class Methods
    {
        public const string PhysicalMail = "physical_mail";
        public const string VideoInterview = "video_interview";
        public const string PaidAssessment = "paid_assessment";
        public const string Referral = "referral";
        public const string Payment = "payment";
        public const string TruthfulnessConfirmation = "truthfulness_confirmation";
    }

    /// <summary>Commitment levels</summary>
    public static class CommitmentLevels
    {
        public const string ReviewVerified = "review_verified";
        public const string PrioritizeVerified = "prioritize_verified";
        public const string RespondVerified = "respond_verified";
    }

    /// <summary>Revocation reasons</summary>
    public static class RevocationReasons
    {
        public const string Fraud = "fraud";
        public const string Error = "error";
        public const string Legal = "legal";
        public const string UserRequest = "user_request";
    }

    /// <summary>
    /// Validates a HAP ID format.
    /// </summary>
    /// <param name="id">The HAP ID to validate</param>
    /// <returns>true if the ID matches the format hap_[a-zA-Z0-9]{12}</returns>
    public static bool IsValidHapId(string id)
    {
        return !string.IsNullOrEmpty(id) && HapIdRegex().IsMatch(id);
    }

    /// <summary>
    /// Generates a cryptographically secure random HAP ID.
    /// </summary>
    /// <returns>A HAP ID in the format hap_[a-zA-Z0-9]{12}</returns>
    public static string GenerateHapId()
    {
        var bytes = RandomNumberGenerator.GetBytes(12);
        var suffix = new char[12];

        for (int i = 0; i < 12; i++)
        {
            suffix[i] = HapIdChars[bytes[i] % HapIdChars.Length];
        }

        return $"hap_{new string(suffix)}";
    }

    /// <summary>
    /// Generates a test HAP ID (for previews and development).
    /// </summary>
    /// <returns>A test HAP ID in the format hap_test_[a-zA-Z0-9]{8}</returns>
    public static string GenerateTestHapId()
    {
        var bytes = RandomNumberGenerator.GetBytes(8);
        var suffix = new char[8];

        for (int i = 0; i < 8; i++)
        {
            suffix[i] = HapIdChars[bytes[i] % HapIdChars.Length];
        }

        return $"hap_test_{new string(suffix)}";
    }

    /// <summary>
    /// Checks if a HAP ID is a test ID.
    /// </summary>
    /// <param name="id">The HAP ID to check</param>
    /// <returns>true if the ID is a test ID</returns>
    public static bool IsTestHapId(string id)
    {
        return !string.IsNullOrEmpty(id) && HapTestIdRegex().IsMatch(id);
    }

    /// <summary>
    /// Checks if a string is a valid HAP Compact format.
    /// </summary>
    /// <param name="compact">The string to check</param>
    /// <returns>true if valid compact format</returns>
    public static bool IsValidCompact(string compact)
    {
        return !string.IsNullOrEmpty(compact) && HapCompactRegex().IsMatch(compact);
    }

    /// <summary>
    /// Computes SHA-256 hash of content with prefix.
    /// </summary>
    /// <param name="content">The content to hash</param>
    /// <returns>Hash string in format "sha256:xxxxx"</returns>
    public static string HashContent(string content)
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var hash = SHA256.HashData(bytes);
        return $"sha256:{Convert.ToHexString(hash).ToLowerInvariant()}";
    }
}
