using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

public class RequestCodeValidator : AbstractValidator<RequestCodeDto>
{
    public RequestCodeValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.")
            .MaximumLength(256);
    }
}

public class VerifyCodeValidator : AbstractValidator<VerifyCodeDto>
{
    public VerifyCodeValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress();

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Code is required.")
            .Length(6).WithMessage("Code must be 6 digits.")
            .Matches(@"^\d{6}$").WithMessage("Code must contain only digits.");
    }
}

public class CreateTaskValidator : AbstractValidator<CreateTaskDto>
{
    public CreateTaskValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.");

        RuleFor(x => x.Priority)
            .IsInEnum().WithMessage("Invalid priority value.");

        RuleFor(x => x.DueDate)
            .GreaterThan(DateTime.UtcNow.AddMinutes(-1))
            .When(x => x.DueDate.HasValue)
            .WithMessage("Due date must be in the future.");

        RuleFor(x => x.Tags)
            .Must(t => t == null || t.Length <= 10)
            .WithMessage("Maximum 10 tags allowed.");
    }
}

public class UpdateTaskValidator : AbstractValidator<UpdateTaskDto>
{
    public UpdateTaskValidator()
    {
        RuleFor(x => x.Title)
            .MaximumLength(200)
            .When(x => x.Title != null);

        RuleFor(x => x.Description)
            .MaximumLength(2000)
            .When(x => x.Description != null);

        RuleFor(x => x.Priority)
            .IsInEnum()
            .When(x => x.Priority.HasValue);

        RuleFor(x => x.Status)
            .IsInEnum()
            .When(x => x.Status.HasValue);

        RuleFor(x => x.Tags)
            .Must(t => t == null || t.Length <= 10)
            .WithMessage("Maximum 10 tags allowed.");
    }
}

public class UpdateProfileValidator : AbstractValidator<UpdateProfileDto>
{
    private static readonly string[] ValidThemes = { "function", "dark", "light" };

    public UpdateProfileValidator()
    {
        RuleFor(x => x.DisplayName)
            .MaximumLength(100)
            .When(x => x.DisplayName != null);

        RuleFor(x => x.ThemePreference)
            .Must(t => t == null || ValidThemes.Contains(t))
            .WithMessage("Theme must be one of: function, dark, light.");
    }
}
