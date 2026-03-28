namespace TodoApi.DTOs;

/// <summary>Response returned once when a new API key is created, including the full key value.</summary>
public record ApiKeyCreatedDto(int Id, string Name, string Key, string KeyPrefix, DateTime CreatedAt);
