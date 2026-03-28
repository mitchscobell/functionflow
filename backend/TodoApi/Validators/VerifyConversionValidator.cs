using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="VerifyConversionDto"/> request body.</summary>
public class VerifyConversionValidator : AbstractValidator<VerifyConversionDto>
{
    public VerifyConversionValidator()
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
