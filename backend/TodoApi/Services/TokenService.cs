using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace TodoApi.Services;

/// <summary>
/// JWT token generation using HMAC-SHA256 signing.
/// </summary>
public class JwtTokenService : ITokenService
{
    private readonly IConfiguration _config;

    public JwtTokenService(IConfiguration config)
    {
        _config = config;
    }

    /// <summary>
    /// Creates a signed JWT containing the user's ID and email.
    /// </summary>
    /// <param name="userId">User primary key placed in the NameIdentifier claim.</param>
    /// <param name="email">User email placed in the Email claim.</param>
    /// <param name="rememberMe">If <c>true</c>, extends the token lifetime.</param>
    /// <returns>The serialised JWT string.</returns>
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

        var expiry = rememberMe ? TimeSpan.FromDays(ValidationConstants.RememberMeExpiryDays) : TimeSpan.FromHours(ValidationConstants.RegularTokenExpiryHours);

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
