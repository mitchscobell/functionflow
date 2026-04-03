using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="VerifyCodeDto"/> request body.</summary>
public class VerifyCodeValidator : AbstractValidator<VerifyCodeDto>
{
    public VerifyCodeValidator()
    {
        RuleFor(x => x.Email)
            .NotEmpty().WithMessage("Email is required.")
            .EmailAddress();

        RuleFor(x => x.Code)
            .NotEmpty().WithMessage("Code is required.")
            .Length(ValidationConstants.AuthCodeLength).WithMessage($"Code must be {ValidationConstants.AuthCodeLength} digits.")
            .Matches($@"^\d{{{ValidationConstants.AuthCodeLength}}}$").WithMessage("Code must contain only digits.");
    }
}
