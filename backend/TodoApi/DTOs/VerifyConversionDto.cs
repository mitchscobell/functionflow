namespace TodoApi.DTOs;

/// <summary>Request body for verifying the conversion code and finalizing demo-to-real account conversion.</summary>
public record VerifyConversionDto(string Email, string Code);
