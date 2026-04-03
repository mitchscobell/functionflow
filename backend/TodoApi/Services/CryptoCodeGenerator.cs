using System.Security.Cryptography;

namespace TodoApi.Services;

/// <summary>Cryptographically secure random code generator.</summary>
public class CryptoCodeGenerator : ICodeGenerator
{
    /// <summary>
    /// Generates a random 6-digit numeric code using <see cref="System.Security.Cryptography.RandomNumberGenerator"/>.
    /// </summary>
    public string GenerateSixDigitCode()
    {
        return RandomNumberGenerator.GetInt32(ValidationConstants.AuthCodeMin, ValidationConstants.AuthCodeMax).ToString();
    }
}
