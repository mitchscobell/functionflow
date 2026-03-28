using System.Reflection;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;

namespace TodoApi.Controllers;

/// <summary>
/// Health check and version information endpoint.
/// No authentication required.
/// </summary>
[ApiController]
[Route("api/version")]
public class VersionController : ControllerBase
{
    private readonly AppDbContext _db;

    public VersionController(AppDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Returns API version, build info, and health status including database connectivity.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetVersion()
    {
        var assembly = Assembly.GetExecutingAssembly();
        var version = assembly.GetName().Version?.ToString(3) ?? "0.0.0";

        var dbHealthy = false;
        try
        {
            dbHealthy = await _db.Database.CanConnectAsync();
        }
        catch
        {
            // database unreachable
        }

        return Ok(new
        {
            name = "FunctionFlow API",
            version,
            status = dbHealthy ? "healthy" : "degraded",
            database = dbHealthy ? "connected" : "unreachable",
            timestamp = DateTime.UtcNow
        });
    }
}
