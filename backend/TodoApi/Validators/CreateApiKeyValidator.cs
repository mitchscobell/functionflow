using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="CreateApiKeyDto"/> request body.</summary>
public class CreateApiKeyValidator : AbstractValidator<CreateApiKeyDto>
{
    public CreateApiKeyValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("Key name is required.")
            .MaximumLength(100);
    }
}
