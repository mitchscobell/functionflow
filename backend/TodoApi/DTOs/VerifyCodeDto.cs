namespace TodoApi.DTOs;

/// <summary>Request body for verifying a 6-digit login code.</summary>
public record VerifyCodeDto(string Email, string Code, bool RememberMe = false);
