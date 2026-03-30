using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TodoApi.Data;

namespace TodoApi.Controllers;

/// <summary>
/// Health check and version information endpoint.
/// No authentication required.
/// </summary>
[ApiController]
[Route("api/version")]
[AllowAnonymous]
public class VersionController : ControllerBase
{
    private static readonly string _version =
        Assembly.GetExecutingAssembly().GetName().Version?.ToString(3) ?? "0.0.0";

    private readonly AppDbContext _db;
    private readonly ILogger<VersionController> _logger;

    public VersionController(AppDbContext db, ILogger<VersionController> logger)
    {
        _db = db;
        _logger = logger;
    }

    /// <summary>
    /// Returns API version, build info, and health status including database connectivity.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetVersion(CancellationToken ct)
    {
        var dbHealthy = false;
        try
        {
            dbHealthy = await _db.Database.CanConnectAsync(ct);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Database health check failed");
        }

        return Ok(new
        {
            name = "FunctionFlow API",
            version = _version,
            status = dbHealthy ? "healthy" : "degraded",
            database = dbHealthy ? "connected" : "unreachable",
            timestamp = DateTime.UtcNow
        });
    }
}
