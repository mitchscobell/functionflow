using System.Net;
using System.Text.Json;

namespace TodoApi.Middleware;

/// <summary>
/// Global error handler that catches unhandled exceptions
/// and returns consistent JSON error responses.
/// </summary>
public class ErrorHandlerMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlerMiddleware> _logger;

    public ErrorHandlerMiddleware(RequestDelegate next, ILogger<ErrorHandlerMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);
            await HandleExceptionAsync(context, ex);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        var (statusCode, message) = exception switch
        {
            KeyNotFoundException => (HttpStatusCode.NotFound, "Resource not found."),
            UnauthorizedAccessException => (HttpStatusCode.Unauthorized, "Unauthorized."),
            ArgumentException => (HttpStatusCode.BadRequest, "Invalid request."),
            _ => (HttpStatusCode.InternalServerError, "An unexpected error occurred.")
        };

        context.Response.ContentType = "application/json";
        context.Response.StatusCode = (int)statusCode;

        var response = JsonSerializer.Serialize(new
        {
            status = (int)statusCode,
            message,
            timestamp = DateTime.UtcNow
        });

        return context.Response.WriteAsync(response);
    }
}
