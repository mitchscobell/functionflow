using FluentValidation;
using TodoApi.DTOs;
using TodoApi.Models;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="UpdateProfileDto"/> request body.</summary>
public class UpdateProfileValidator : AbstractValidator<UpdateProfileDto>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.DisplayName)
            .MaximumLength(100)
            .When(x => x.DisplayName != null);

        RuleFor(x => x.ThemePreference)
            .Must(t => t == null || ThemeNames.Valid.Contains(t))
            .WithMessage($"Theme must be one of: {string.Join(", ", ThemeNames.Valid)}.");
    }
}
