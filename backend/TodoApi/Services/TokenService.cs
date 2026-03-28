using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TodoApi.Services;

/// <summary>
/// Generates JWT tokens for authenticated users.
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Creates a signed JWT for the given user.
    /// </summary>
    /// <param name="userId">Database user ID.</param>
    /// <param name="email">User's email address.</param>
    /// <param name="rememberMe">If true, token lasts 30 days; otherwise 7 days.</param>
    string GenerateToken(int userId, string email, bool rememberMe = false);
}

/// <summary>
/// JWT token generation using HMAC-SHA256 signing.
/// </summary>
public class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public string GenerateToken(int userId, string email, bool rememberMe = false)
    {
        var key = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(_config["Jwt:Key"] ?? throw new InvalidOperationException("JWT key not configured"))
        );

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var expiry = rememberMe ? TimeSpan.FromDays(30) : TimeSpan.FromDays(7);

        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"] ?? "FunctionFlow",
            audience: _config["Jwt:Audience"] ?? "FunctionFlow",
            claims: claims,
            expires: DateTime.UtcNow.Add(expiry),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
