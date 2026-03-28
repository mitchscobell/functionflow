using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="UpdateProfileDto"/> request body.</summary>
public class UpdateProfileValidator : AbstractValidator<UpdateProfileDto>
{
    private static readonly string[] ValidThemes = { "function", "dark", "light", "vaporwave", "cyberpunk" };

    public UpdateProfileValidator()
    {
        RuleFor(x => x.DisplayName)
            .MaximumLength(100)
            .When(x => x.DisplayName != null);

        RuleFor(x => x.ThemePreference)
            .Must(t => t == null || ValidThemes.Contains(t))
            .WithMessage("Theme must be one of: function, dark, light, vaporwave, cyberpunk.");
    }
}
