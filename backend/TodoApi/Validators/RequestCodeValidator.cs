using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="RequestCodeDto"/> request body.</summary>
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
