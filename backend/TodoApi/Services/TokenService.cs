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

        var expiry = rememberMe ? TimeSpan.FromDays(7) : TimeSpan.FromHours(4);

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
