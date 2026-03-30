using FluentValidation;
using Microsoft.AspNetCore.Mvc;
using TodoApi.DTOs;
using TodoApi.Models;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using TodoApi.Services;
using TodoApi.Repositories;

namespace TodoApi.Controllers;

/// <summary>
/// Handles passwordless email-code authentication, ephemeral demo sessions,
/// and demo session teardown.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IUserRepository _users;
    private readonly IAuthCodeRepository _authCodes;
    private readonly ITaskRepository _tasks;
    private readonly IListRepository _lists;
    private readonly IApiKeyRepository _apiKeys;
    private readonly IEmailService _emailService;
    private readonly ITokenService _tokenService;
    private readonly IValidator<RequestCodeDto> _requestCodeValidator;
    private readonly IValidator<VerifyCodeDto> _verifyCodeValidator;
    private readonly IValidator<ConvertDemoDto> _convertDemoValidator;
    private readonly IValidator<VerifyConversionDto> _verifyConversionValidator;
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<AuthController> _logger;
    private readonly IAdminNotifier _adminNotifier;
    private readonly ICodeGenerator _codeGenerator;

    public AuthController(
        IUserRepository users,
        IAuthCodeRepository authCodes,
        ITaskRepository tasks,
        IListRepository lists,
        IApiKeyRepository apiKeys,
        IEmailService emailService,
        ITokenService tokenService,
        IValidator<RequestCodeDto> requestCodeValidator,
        IValidator<VerifyCodeDto> verifyCodeValidator,
        IValidator<ConvertDemoDto> convertDemoValidator,
        IValidator<VerifyConversionDto> verifyConversionValidator,
        IWebHostEnvironment env,
        ILogger<AuthController> logger,
        IAdminNotifier adminNotifier,
        ICodeGenerator codeGenerator)
    {
        _users = users;
        _authCodes = authCodes;
        _tasks = tasks;
        _lists = lists;
        _apiKeys = apiKeys;
        _emailService = emailService;
        _tokenService = tokenService;
        _requestCodeValidator = requestCodeValidator;
        _verifyCodeValidator = verifyCodeValidator;
        _convertDemoValidator = convertDemoValidator;
        _verifyConversionValidator = verifyConversionValidator;
        _env = env;
        _logger = logger;
        _adminNotifier = adminNotifier;
        _codeGenerator = codeGenerator;
    }

    /// <summary>
    /// Sends a 6-digit auth code to the provided email address.
    /// Creates a new user account if one doesn't exist.
    /// </summary>
    [HttpPost("request-code")]
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> RequestCode([FromBody] RequestCodeDto dto)
    {
        var validation = await _requestCodeValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        // Invalidate any existing unused codes for this email
        var existingCodes = await _authCodes.GetActiveCodesAsync(normalizedEmail);
        foreach (var existing in existingCodes)
        {
            existing.IsUsed = true;
            await _authCodes.UpdateAsync(existing);
        }

        var code = _codeGenerator.GenerateSixDigitCode();
        var authCode = new AuthCode
        {
            Email = normalizedEmail,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10)
        };

        await _authCodes.CreateAsync(authCode);

        try
        {
            await _emailService.SendAuthCodeAsync(normalizedEmail, code);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }

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
    [EnableRateLimiting("auth")]
    public async Task<IActionResult> VerifyCode([FromBody] VerifyCodeDto dto)
    {
        var validation = await _verifyCodeValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var authCode = await _authCodes.GetValidCodeAsync(normalizedEmail, dto.Code);

        if (authCode == null)
            return Unauthorized(new { message = "Invalid or expired code." });

        authCode.IsUsed = true;

        // Find or create user
        var user = await _users.GetByEmailAsync(normalizedEmail);
        if (user == null)
        {
            user = new User
            {
                Email = normalizedEmail,
                DisplayName = normalizedEmail.Split('@')[0]
            };
            await _users.CreateAsync(user);
            await SeedStarterDataAsync(user);
        }

        authCode.UserId = user.Id;
        await _authCodes.UpdateAsync(authCode);

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
    /// Instantly logs in with a session-scoped ephemeral demo account.
    /// Seeds example tasks on creation. Data is destroyed on logout.
    /// </summary>
    [HttpPost("dev-login")]
    public async Task<IActionResult> DevLogin(
        [FromBody] RequestCodeDto dto,
        [FromServices] IWebHostEnvironment _)
    {
        // Each dev-login creates a unique ephemeral session
        var sessionId = Guid.NewGuid().ToString("N")[..8];
        var ephemeralEmail = $"demo-{sessionId}@functionflow.local";

        var user = new User
        {
            Email = ephemeralEmail,
            DisplayName = "Demo User"
        };
        await _users.CreateAsync(user);

        await SeedStarterDataAsync(user);

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
    /// Step 1 of demo-to-real account conversion. Sends a verification code
    /// to the real email address. Only works for demo accounts.
    /// </summary>
    [HttpPost("convert-demo")]
    [Authorize]
    public async Task<IActionResult> ConvertDemo([FromBody] ConvertDemoDto dto)
    {
        var validation = await _convertDemoValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _users.GetByIdAsync(userId);
        if (user == null || !user.Email.EndsWith("@functionflow.local"))
            return BadRequest(new { message = "Only demo accounts can be converted." });

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        // Check if a real account already exists with this email
        var existing = await _users.GetByEmailAsync(normalizedEmail);
        if (existing != null)
            return Conflict(new { message = "An account with this email already exists." });

        // Invalidate any existing unused codes for this email
        var existingCodes = await _authCodes.GetActiveCodesAsync(normalizedEmail);
        foreach (var ec in existingCodes)
        {
            ec.IsUsed = true;
            await _authCodes.UpdateAsync(ec);
        }

        var code = _codeGenerator.GenerateSixDigitCode();
        var authCode = new AuthCode
        {
            Email = normalizedEmail,
            Code = code,
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            UserId = user.Id
        };

        await _authCodes.CreateAsync(authCode);

        try
        {
            await _emailService.SendAuthCodeAsync(normalizedEmail, code);
        }
        catch (InvalidOperationException ex)
        {
            return StatusCode(503, new { message = ex.Message });
        }

        if (_env.IsDevelopment())
            _logger.LogInformation("[DEV] Conversion code for {Email}: {Code}", normalizedEmail, code);

        return Ok(new { message = "Verification code sent to your email." });
    }

    /// <summary>
    /// Step 2 of demo-to-real account conversion. Verifies the code and
    /// updates the demo account's email (and optionally display name).
    /// Returns a new JWT with the updated email.
    /// </summary>
    [HttpPost("verify-conversion")]
    [Authorize]
    public async Task<IActionResult> VerifyConversion([FromBody] VerifyConversionDto dto)
    {
        var validation = await _verifyConversionValidator.ValidateAsync(dto);
        if (!validation.IsValid)
            return BadRequest(new { errors = validation.Errors.Select(e => e.ErrorMessage) });

        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
            return Unauthorized();

        var user = await _users.GetByIdAsync(userId);
        if (user == null || !user.Email.EndsWith("@functionflow.local"))
            return BadRequest(new { message = "Only demo accounts can be converted." });

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();

        var authCode = await _authCodes.GetValidCodeAsync(normalizedEmail, dto.Code);
        if (authCode == null)
            return Unauthorized(new { message = "Invalid or expired code." });

        // Double check no one claimed this email in the meantime
        var existing = await _users.GetByEmailAsync(normalizedEmail);
        if (existing != null)
            return Conflict(new { message = "An account with this email already exists." });

        authCode.IsUsed = true;
        await _authCodes.UpdateAsync(authCode);

        // Convert the account
        user.Email = normalizedEmail;
        user.DisplayName = normalizedEmail.Split('@')[0];
        user.UpdatedAt = DateTime.UtcNow;
        await _users.UpdateAsync(user);

        // Issue a fresh token with the new email
        var token = _tokenService.GenerateToken(user.Id, user.Email);

        await _adminNotifier.SendAsync(
            "Demo Converted",
            $"Demo session {userId} converted to {normalizedEmail} at {DateTime.UtcNow:u}.");

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

        var user = await _users.GetByIdAsync(userId);
        if (user == null || !user.Email.EndsWith("@functionflow.local"))
            return BadRequest(new { message = "Not a demo account." });

        // Remove all related data
        await _tasks.DeleteAllByUserIdAsync(userId);
        await _lists.DeleteAllByUserIdAsync(userId);
        await _authCodes.DeleteByUserIdAsync(userId);
        await _apiKeys.DeleteByUserIdAsync(userId);
        await _users.DeleteAsync(user);

        await _adminNotifier.SendAsync(
            "Demo Session Ended",
            $"Demo session {user.Email} destroyed at {DateTime.UtcNow:u}.");

        return Ok(new { message = "Demo session destroyed." });
    }

    private async Task SeedStarterDataAsync(User user)
    {
        var workList = new TaskList { Name = "Work", Emoji = "💼", Color = "blue", SortOrder = 0, UserId = user.Id };
        var personalList = new TaskList { Name = "Personal", Emoji = "🏠", Color = "green", SortOrder = 1, UserId = user.Id };
        var projectList = new TaskList { Name = "Side Project", Emoji = "🚀", Color = "purple", SortOrder = 2, UserId = user.Id };
        await _lists.CreateAsync(workList);
        await _lists.CreateAsync(personalList);
        await _lists.CreateAsync(projectList);

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

        foreach (var task in seedTasks)
            await _tasks.CreateAsync(task);
    }
}
