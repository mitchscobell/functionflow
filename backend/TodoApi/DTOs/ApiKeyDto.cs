namespace TodoApi.DTOs;

/// <summary>Public representation of an API key (secret value omitted).</summary>
public record ApiKeyDto(int Id, string Name, string KeyPrefix, DateTime CreatedAt, DateTime? ExpiresAt, bool IsRevoked);
