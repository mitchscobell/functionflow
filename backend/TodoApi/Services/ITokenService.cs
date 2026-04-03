namespace TodoApi.Services;

/// <summary>Generates JWT tokens for authenticated users.</summary>
public interface ITokenService
{
    /// <summary>
    /// Creates a signed JWT for the given user.
    /// </summary>
    /// <param name="userId">Database user ID.</param>
    /// <param name="email">User's email address.</param>
    /// <param name="rememberMe">If true, token lasts 30 days; otherwise 4 hours.</param>
    string GenerateToken(int userId, string email, bool rememberMe = false);
}
