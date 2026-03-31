using System.Net;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using TodoApi.Middleware;

namespace TodoApi.Tests;

public class ErrorHandlerMiddlewareTests
{
    private static ErrorHandlerMiddleware CreateMiddleware(RequestDelegate next) =>
        new(next, NullLogger<ErrorHandlerMiddleware>.Instance);

    private static DefaultHttpContext CreateContext()
    {
        var context = new DefaultHttpContext();
        context.Response.Body = new MemoryStream();
        return context;
    }

    private static async Task<(int StatusCode, JsonDocument Body)> GetResponse(HttpContext context)
    {
        context.Response.Body.Seek(0, SeekOrigin.Begin);
        var body = await JsonDocument.ParseAsync(context.Response.Body);
        return (context.Response.StatusCode, body);
    }

    // ── Exception Mapping ──

    [Fact(DisplayName = "No exception passes through with 200")]
    public async Task NoException_PassesThrough()
    {
        var middleware = CreateMiddleware(_ => Task.CompletedTask);
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        Assert.Equal(200, context.Response.StatusCode);
    }

    [Fact(DisplayName = "KeyNotFoundException maps to 404 with 'Resource not found'")]
    public async Task KeyNotFoundException_Returns404()
    {
        var middleware = CreateMiddleware(_ => throw new KeyNotFoundException("Not found"));
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        var (status, body) = await GetResponse(context);
        Assert.Equal((int)HttpStatusCode.NotFound, status);
        Assert.Equal("Resource not found.", body.RootElement.GetProperty("message").GetString());
        Assert.Equal(404, body.RootElement.GetProperty("status").GetInt32());
    }

    [Fact(DisplayName = "UnauthorizedAccessException maps to 401")]
    public async Task UnauthorizedAccessException_Returns401()
    {
        var middleware = CreateMiddleware(_ => throw new UnauthorizedAccessException());
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        var (status, body) = await GetResponse(context);
        Assert.Equal((int)HttpStatusCode.Unauthorized, status);
        Assert.Equal("Unauthorized.", body.RootElement.GetProperty("message").GetString());
    }

    [Fact(DisplayName = "ArgumentException maps to 400 with 'Invalid request'")]
    public async Task ArgumentException_Returns400WithMessage()
    {
        var middleware = CreateMiddleware(_ => throw new ArgumentException("Bad input value"));
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        var (status, body) = await GetResponse(context);
        Assert.Equal((int)HttpStatusCode.BadRequest, status);
        Assert.Equal("Invalid request.", body.RootElement.GetProperty("message").GetString());
    }

    [Fact(DisplayName = "Unhandled exception maps to 500")]
    public async Task GenericException_Returns500()
    {
        var middleware = CreateMiddleware(_ => throw new InvalidOperationException("Something broke"));
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        var (status, body) = await GetResponse(context);
        Assert.Equal((int)HttpStatusCode.InternalServerError, status);
        Assert.Equal("An unexpected error occurred.", body.RootElement.GetProperty("message").GetString());
    }

    // ── Response Format ──

    [Fact(DisplayName = "Error response includes a timestamp")]
    public async Task ExceptionResponse_HasTimestamp()
    {
        var middleware = CreateMiddleware(_ => throw new Exception("test"));
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        var (_, body) = await GetResponse(context);
        Assert.True(body.RootElement.TryGetProperty("timestamp", out _));
    }

    [Fact(DisplayName = "Error response content type is application/json")]
    public async Task ExceptionResponse_ContentTypeIsJson()
    {
        var middleware = CreateMiddleware(_ => throw new Exception("test"));
        var context = CreateContext();

        await middleware.InvokeAsync(context);

        Assert.Equal("application/json", context.Response.ContentType);
    }
}
