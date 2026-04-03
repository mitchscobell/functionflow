using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="ConvertDemoDto"/> request body.</summary>
public class ConvertDemoValidator : AbstractValidator<ConvertDemoDto>
{
    public ConvertDemoValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress().WithMessage("A valid email address is required.")
            .MaximumLength(256)
            .Must(e => !e.EndsWith(ValidationConstants.DemoEmailDomain))
            .WithMessage("Cannot convert to another demo email.");

        RuleFor(x => x.DisplayName)
            .MaximumLength(100)
            .When(x => x.DisplayName != null);
    }
}
