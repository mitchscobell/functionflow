using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="UpdateListDto"/> request body.</summary>
public class UpdateListValidator : AbstractValidator<UpdateListDto>
{
    public UpdateListValidator()
    {
        RuleFor(x => x.Name)
            .MaximumLength(ValidationConstants.ListNameMaxLength)
            .When(x => x.Name != null);

        RuleFor(x => x.Emoji)
            .MaximumLength(ValidationConstants.EmojiMaxLength)
            .When(x => x.Emoji != null);

        RuleFor(x => x.Color)
            .MaximumLength(ValidationConstants.ColorMaxLength)
            .When(x => x.Color != null);
    }
}
