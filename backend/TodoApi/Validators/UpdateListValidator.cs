using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="UpdateListDto"/> request body.</summary>
public class UpdateListValidator : AbstractValidator<UpdateListDto>
{
    public UpdateListValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(100)
            .When(x => x.Name != null);

        RuleFor(x => x.Emoji)
            .MaximumLength(8)
            .When(x => x.Emoji != null);

        RuleFor(x => x.Color)
            .MaximumLength(30)
            .When(x => x.Color != null);
    }
}
