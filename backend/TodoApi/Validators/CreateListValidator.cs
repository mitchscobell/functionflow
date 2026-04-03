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
            .MaximumLength(ValidationConstants.ListNameMaxLength);

        RuleFor(x => x.Emoji)
            .MaximumLength(ValidationConstants.EmojiMaxLength)
            .When(x => x.Emoji != null);

        RuleFor(x => x.Color)
            .MaximumLength(ValidationConstants.ColorMaxLength)
            .When(x => x.Color != null);
    }
}
