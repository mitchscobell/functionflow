using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="CreateListDto"/> request body.</summary>
public class CreateListValidator : AbstractValidator<CreateListDto>
{
    public CreateListValidator()
    {
        RuleFor(x => x.Name)
            .NotEmpty().WithMessage("List name is required.")
            .MaximumLength(100);

        RuleFor(x => x.Emoji)
            .MaximumLength(8)
            .When(x => x.Emoji != null);

        RuleFor(x => x.Color)
            .MaximumLength(30)
            .When(x => x.Color != null);
    }
}
