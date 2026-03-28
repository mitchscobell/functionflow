namespace TodoApi.DTOs;

/// <summary>Request body for sending a login code to an email address.</summary>
public record RequestCodeDto(string Email);
