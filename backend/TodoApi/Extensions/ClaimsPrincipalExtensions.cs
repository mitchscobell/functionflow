using System.Security.Claims;

namespace TodoApi.Extensions;

/// <summary>
/// Extension methods for <see cref="ClaimsPrincipal"/> to extract common claims.
/// </summary>
public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// Extracts the authenticated user's ID from the NameIdentifier claim.
    /// </summary>
    public static int GetUserId(this ClaimsPrincipal principal) =>
        int.Parse(principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new UnauthorizedAccessException());
}
