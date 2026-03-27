using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TodoApi.Data;
using TodoApi.DTOs;
using TodoApi.Models;
using TodoApi.Services;

namespace TodoApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IEmailService _emailService;
    private readonly ITokenService _tokenService;
    private readonly IValidator<RequestCodeDto> _requestCodeValidator;
    private readonly IValidator<VerifyCodeDto> _verifyCodeValidator;

    public AuthController(
        AppDbContext db,
        IEmailService emailService,
        ITokenService tokenService,
        IValidator<RequestCodeDto> requestCodeValidator,
        IValidator<VerifyCodeDto> verifyCodeValidator)
    {
        _db = db;
        _emailService = emailService;
        _tokenService = tokenService;
        _requestCodeValidator = requestCodeValidator;
        _verifyCodeValidator = verifyCodeValidator;
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

        var token = _tokenService.GenerateToken(user.Id, user.Email);

        return Ok(new AuthResponseDto(
            token,
            new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference)
        ));
    }

    /// <summary>
    /// Dev-only: instantly logs in with a given email, skipping code verification.
    /// Seeds the account with example tasks on first login.
    /// Only available when ASPNETCORE_ENVIRONMENT=Development.
    /// </summary>
    [HttpPost("dev-login")]
    public async Task<IActionResult> DevLogin(
        [FromBody] RequestCodeDto dto,
        [FromServices] IWebHostEnvironment env)
    {
        if (!env.IsDevelopment())
            return NotFound();

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var user = await _db.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail);
        var isNewUser = user == null;

        if (isNewUser)
        {
            user = new User
            {
                Email = normalizedEmail,
                DisplayName = "Demo User"
            };
            _db.Users.Add(user);
            await _db.SaveChangesAsync();

            // Seed example tasks so the dashboard isn't empty
            var now = DateTime.UtcNow;
            var seedTasks = new[]
            {
                new TodoTask
                {
                    Title = "Review project requirements",
                    Description = "Go through the spec document and note any open questions.",
                    Priority = TaskPriority.High,
                    Status = Models.TaskStatus.Done,
                    Tags = new[] { "planning" },
                    DueDate = now.AddDays(-2),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Set up CI/CD pipeline",
                    Description = "Configure GitHub Actions for automated builds and test runs.",
                    Priority = TaskPriority.High,
                    Status = Models.TaskStatus.InProgress,
                    Tags = new[] { "devops", "infrastructure" },
                    DueDate = now.AddDays(1),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Design database schema",
                    Description = "Map out entities, relationships, and indexes for the initial release.",
                    Priority = TaskPriority.Medium,
                    Status = Models.TaskStatus.Done,
                    Tags = new[] { "backend", "planning" },
                    DueDate = now.AddDays(-1),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Write integration tests",
                    Description = "Cover auth, task CRUD, and profile endpoints with WebApplicationFactory tests.",
                    Priority = TaskPriority.Medium,
                    Status = Models.TaskStatus.InProgress,
                    Tags = new[] { "testing", "backend" },
                    DueDate = now.AddDays(3),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Build dashboard UI",
                    Description = "Task list with search, filters, sorting, and pagination.",
                    Priority = TaskPriority.High,
                    Status = Models.TaskStatus.Todo,
                    Tags = new[] { "frontend" },
                    DueDate = now.AddDays(2),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Add dark mode support",
                    Description = "Implement theme switcher with Function, Dark, and Light themes.",
                    Priority = TaskPriority.Low,
                    Status = Models.TaskStatus.Todo,
                    Tags = new[] { "frontend", "design" },
                    DueDate = now.AddDays(5),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Configure Docker deployment",
                    Description = "Create Dockerfiles for backend and frontend, write docker-compose.yml.",
                    Priority = TaskPriority.Medium,
                    Status = Models.TaskStatus.Todo,
                    Tags = new[] { "devops" },
                    DueDate = now.AddDays(4),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Write README documentation",
                    Description = "Setup instructions, API reference, architecture decisions.",
                    Priority = TaskPriority.Low,
                    Status = Models.TaskStatus.Todo,
                    Tags = new[] { "docs" },
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Buy groceries",
                    Description = "Milk, eggs, bread, coffee beans, avocados.",
                    Priority = TaskPriority.Low,
                    Status = Models.TaskStatus.Todo,
                    Tags = new[] { "personal", "errands" },
                    DueDate = now.AddDays(0),
                    UserId = user.Id
                },
                new TodoTask
                {
                    Title = "Prepare sprint demo",
                    Description = "Put together a quick walkthrough of the new features for Friday's meeting.",
                    Priority = TaskPriority.High,
                    Status = Models.TaskStatus.Todo,
                    Tags = new[] { "work", "presentation" },
                    DueDate = now.AddDays(-1),
                    UserId = user.Id
                }
            };

            _db.Tasks.AddRange(seedTasks);
            await _db.SaveChangesAsync();
        }

        var token = _tokenService.GenerateToken(user!.Id, user.Email);

        return Ok(new AuthResponseDto(
            token,
            new UserDto(user.Id, user.Email, user.DisplayName, user.ThemePreference)
        ));
    }
}
