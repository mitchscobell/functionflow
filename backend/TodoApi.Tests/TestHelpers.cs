using System.Text.Json;
using System.Text.Json.Serialization;

namespace TodoApi.Tests;

public static class TestHelpers
{
    public static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter() }
    };
}
