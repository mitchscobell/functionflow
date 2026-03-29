namespace TodoApi.Services;

/// <summary>Generates secure random codes for authentication.</summary>
public interface ICodeGenerator
{
    string GenerateSixDigitCode();
}
