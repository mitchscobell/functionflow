using System.Security.Cryptography;

namespace TodoApi.Services;

/// <summary>Cryptographically secure random code generator.</summary>
public class CryptoCodeGenerator : ICodeGenerator
{
    public string GenerateSixDigitCode()
    {
        return RandomNumberGenerator.GetInt32(100000, 1000000).ToString();
    }
}
