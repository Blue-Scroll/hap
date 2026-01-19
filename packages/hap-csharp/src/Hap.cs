using System.Security.Cryptography;
using System.Text.RegularExpressions;

namespace BlueScroll.Hap;

/// <summary>
/// HAP (Human Application Protocol) SDK for .NET.
///
/// HAP is an open standard for verified job applications. It enables Verification
/// Authorities (VAs) to cryptographically attest that an applicant took deliberate,
/// costly action when applying for a job.
/// </summary>
public static partial class Hap
{
    /// <summary>Protocol version</summary>
    public const string Version = "0.1";

    /// <summary>Characters for HAP ID generation</summary>
    private const string HapIdChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    /// <summary>HAP ID regex pattern</summary>
    [GeneratedRegex(@"^hap_[a-zA-Z0-9]{12}$")]
    private static partial Regex HapIdRegex();

    /// <summary>Claim types</summary>
    public static class ClaimTypes
    {
        public const string HumanEffort = "human_effort";
        public const string EmployerCommitment = "employer_commitment";
    }

    /// <summary>Core verification methods</summary>
    public static class Methods
    {
        public const string PhysicalMail = "physical_mail";
        public const string VideoInterview = "video_interview";
        public const string PaidAssessment = "paid_assessment";
        public const string Referral = "referral";
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
}
