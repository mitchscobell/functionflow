using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using TodoApi.Services;

namespace TodoApi.Controllers;

/// <summary>
/// Handles passwordless email-code authentication, ephemeral demo sessions,
/// and demo session teardown.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ITokenService _tokenService;
    private readonly IValidator<RequestCodeDto> _requestCodeValidator;
    private readonly IValidator<VerifyCodeDto> _verifyCodeValidator;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;
    private readonly IAdminNotifier _adminNotifier;

    public AuthController(
        AppDbContext db,
        IEmailService emailService,
        ITokenService tokenService,
        IValidator<RequestCodeDto> requestCodeValidator,
        IValidator<VerifyCodeDto> verifyCodeValidator,
        IWebHostEnvironment env,
        ILogger<AuthController> logger,
        IAdminNotifier adminNotifier)
    {
        _db = db;
        _emailService = emailService;
        _tokenService = tokenService;
        _requestCodeValidator = requestCodeValidator;
        _verifyCodeValidator = verifyCodeValidator;
        _env = env;
        _logger = logger;
        _adminNotifier = adminNotifier;
    }

    /// <summary>
    /// Sends a 6-digit auth code to the provided email address.
    /// Creates a new user account if one doesn't exist.
    /// </summary>
    [HttpPost("request-code")]
    public async Task<IActionResult> RequestCode([FromBody] RequestCodeDto dto)
    {
        var validation = await _requestCodeValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        // Invalidate any existing unused codes for this email
        var existingCodes = await _db.AuthCodes
            .Where(c => c.Email == normalizedEmail && !c.IsUsed && c.ExpiresAt > DateTime.UtcNow)
            .ToListAsync();

        foreach (var existing in existingCodes)
            existing.IsUsed = true;

        var code = CodeGenerator.GenerateSixDigitCode();
        var authCode = new AuthCode
        {
            Email = normalizedEmail,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        _db.AuthCodes.Add(authCode);
        await _db.SaveChangesAsync();

        await _emailService.SendAuthCodeAsync(normalizedEmail, code);

        if (_env.IsDevelopment())
            _logger.LogInformation("[DEV] Auth code for {Email}: {Code}", normalizedEmail, code);

        await _adminNotifier.SendAsync(
            "Code Requested",
            $"{normalizedEmail} requested a login code at {DateTime.UtcNow:u}.");

        return Ok(new { message = "Code sent. Check your email." });
    }

    /// <summary>
    /// Verifies the 6-digit code and returns a JWT token.
    /// Auto-creates user on first successful verification.
    /// </summary>
    [HttpPost("verify-code")]
    public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto)
    {
        var validation = await _verifyCodeValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var authCode = await _db.AuthCodes
            .Where(c => c.Email == normalizedEmail && c.Code == dto.Code && !c.IsUsed && c.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(c => c.CreatedAt)
            .FirstOrDefaultAsync();

        if (authCode == null)
            return Unauthorized(new { message = "Invalid or expired code." });

        authCode.IsUsed = true;

        // Find or create user
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        if (user == null)
        {
            user = new User
            {
                Email = normalizedEmail,
                DisplayName = normalizedEmail.Split('@')[0]
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
        }

        authCode.UserId = user.Id;
        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user.Id, user.Email, dto.RememberMe);

        await _adminNotifier.SendAsync(
            user.CreatedAt >= DateTime.UtcNow.AddSeconds(-5) ? "New User Sign-Up" : "User Login",
            $"{normalizedEmail} logged in at {DateTime.UtcNow:u}.");

        return Ok(new AuthResponseDto(
            token,
            new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference)
        ));
    }

    /// <summary>
    /// Dev-only: instantly logs in with a session-scoped ephemeral demo account.
    /// Seeds example tasks on creation. Data is destroyed on logout.
    /// Only available when ASPNETCORE_ENVIRONMENT=Development.
    /// </summary>
    [HttpPost("dev-login")]
    public async Task<IActionResult> DevLogin(
        [FromBody] RequestCodeDto dto,
        [FromServices] IWebHostEnvironment _)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        // Each dev-login creates a unique ephemeral session
        var sessionId = Guid.NewGuid().ToString("N")[..8];
        var ephemeralEmail = $"demo-{sessionId}@functionflow.local";

        var user = new User
        {
            Email = ephemeralEmail,
            DisplayName = "Demo User"
        };
        _db.Users.Add(user);
        await _db.SaveChangesAsync();

        // Seed lists
        var workList = new TaskList { Name = "Work", Emoji = "💼", Color = "blue", SortOrder = 0, UserId = user.Id };
        var personalList = new TaskList { Name = "Personal", Emoji = "🏠", Color = "green", SortOrder = 1, UserId = user.Id };
        var projectList = new TaskList { Name = "Side Project", Emoji = "🚀", Color = "purple", SortOrder = 2, UserId = user.Id };
        _db.TaskLists.AddRange(workList, personalList, projectList);
        await _db.SaveChangesAsync();

        // Seed tasks with dates relative to today
        var today = DateTime.UtcNow.Date;
        var seedTasks = new[]
        {
            new TodoTask
            {
                Title = "Review project requirements",
                Description = "Go through the spec document and note any open questions.",
                Priority = TaskPriority.High,
                Status = Models.TaskStatus.Done,
                Tags = new[] { "planning" },
                DueDate = today.AddDays(-3),
                ListId = workList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Design database schema",
                Description = "Map out entities, relationships, and indexes for the initial release.",
                Priority = TaskPriority.Medium,
                Status = Models.TaskStatus.Done,
                Tags = new[] { "backend", "planning" },
                DueDate = today.AddDays(-1),
                ListId = projectList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Prepare sprint demo",
                Description = "Put together a quick walkthrough of the new features for Friday's meeting.",
                Priority = TaskPriority.High,
                Status = Models.TaskStatus.InProgress,
                Tags = new[] { "work", "presentation" },
                DueDate = today.AddDays(-1),
                ListId = workList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Buy groceries",
                Description = "Milk, eggs, bread, coffee beans, avocados.",
                Priority = TaskPriority.Low,
                Status = Models.TaskStatus.Todo,
                Tags = new[] { "errands" },
                DueDate = today,
                ListId = personalList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Set up CI/CD pipeline",
                Description = "Configure GitHub Actions for automated builds and test runs.",
                Priority = TaskPriority.High,
                Status = Models.TaskStatus.InProgress,
                Tags = new[] { "devops", "infrastructure" },
                DueDate = today,
                ListId = projectList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Write integration tests",
                Description = "Cover auth, task CRUD, and profile endpoints with WebApplicationFactory tests.",
                Notes = "Remember to test edge cases like expired codes and user isolation.",
                Url = "https://learn.microsoft.com/en-us/aspnet/core/test/integration-tests",
                Priority = TaskPriority.Medium,
                Status = Models.TaskStatus.Todo,
                Tags = new[] { "testing", "backend" },
                DueDate = today.AddDays(1),
                ListId = projectList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Build dashboard UI",
                Description = "Task list with search, filters, sorting, and pagination.",
                Priority = TaskPriority.High,
                Status = Models.TaskStatus.Todo,
                Tags = new[] { "frontend" },
                DueDate = today.AddDays(2),
                ListId = projectList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Schedule dentist appointment",
                Description = "Call Dr. Miller's office for a checkup.",
                Priority = TaskPriority.Medium,
                Status = Models.TaskStatus.Todo,
                Tags = new[] { "health" },
                DueDate = today.AddDays(3),
                ListId = personalList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Configure Docker deployment",
                Description = "Create Dockerfiles for backend and frontend, write docker-compose.yml.",
                Priority = TaskPriority.Medium,
                Status = Models.TaskStatus.Todo,
                Tags = new[] { "devops" },
                DueDate = today.AddDays(5),
                ListId = workList.Id,
                UserId = user.Id
            },
            new TodoTask
            {
                Title = "Write README documentation",
                Description = "Setup instructions, API reference, architecture decisions.",
                Priority = TaskPriority.Low,
                Status = Models.TaskStatus.Todo,
                Tags = new[] { "docs" },
                DueDate = today.AddDays(7),
                ListId = projectList.Id,
                UserId = user.Id
            }
        };

        _db.Tasks.AddRange(seedTasks);
        await _db.SaveChangesAsync();

        var token = _tokenService.GenerateToken(user.Id, user.Email);

        await _adminNotifier.SendAsync(
            "Demo Session Started",
            $"Demo session {ephemeralEmail} started at {DateTime.UtcNow:u}.");

        return Ok(new AuthResponseDto(
            token,
            new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference)
        ));
    }

    /// <summary>
    /// Destroys an ephemeral demo session. Deletes all data for the demo user.
    /// Only works for demo accounts (email ending in @functionflow.local).
    /// </summary>
    [HttpPost("demo-logout")]
    [Authorize]
    public async Task<IActionResult> DemoLogout()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _db.Users.FindAsync(userId);
        if (user == null || !user.Email.EndsWith("@functionflow.local"))
            return BadRequest(new { message = "Not a demo account." });

        // Remove all related data
        var tasks = await _db.Tasks.IgnoreQueryFilters()
            .Where(t => t.UserId == userId).ToListAsync();
        _db.Tasks.RemoveRange(tasks);

        var lists = await _db.TaskLists.Where(l => l.UserId == userId).ToListAsync();
        _db.TaskLists.RemoveRange(lists);

        var codes = await _db.AuthCodes.Where(c => c.UserId == userId).ToListAsync();
        _db.AuthCodes.RemoveRange(codes);

        var keys = await _db.ApiKeys.Where(k => k.UserId == userId).ToListAsync();
        _db.ApiKeys.RemoveRange(keys);

        _db.Users.Remove(user);
        await _db.SaveChangesAsync();

        await _adminNotifier.SendAsync(
            "Demo Session Ended",
            $"Demo session {user.Email} destroyed at {DateTime.UtcNow:u}.");

        return Ok(new { message = "Demo session destroyed." });
    }
}
