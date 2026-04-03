using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="UpdateTaskDto"/> request body.</summary>
public class UpdateTaskValidator : AbstractValidator<UpdateTaskDto>
{
    public UpdateTaskValidator()
    {
        RuleFor(x => x.Title)
            .MaximumLength(ValidationConstants.TitleMaxLength)
            .When(x => x.Title != null);

        RuleFor(x => x.Description)
            .MaximumLength(ValidationConstants.DescriptionMaxLength)
            .When(x => x.Description != null);

        RuleFor(x => x.Notes)
            .MaximumLength(ValidationConstants.NotesMaxLength)
            .When(x => x.Notes != null);

        RuleFor(x => x.Url)
            .MaximumLength(ValidationConstants.UrlMaxLength)
            .Must(u => u == null || Uri.TryCreate(u, UriKind.Absolute, out _))
            .When(x => x.Url != null);

        RuleFor(x => x.Priority)
            .IsInEnum()
            .When(x => x.Priority.HasValue);

        RuleFor(x => x.Status)
            .IsInEnum()
            .When(x => x.Status.HasValue);

        RuleFor(x => x.Tags)
            .Must(t => t == null || t.Length <= ValidationConstants.MaxTags)
            .WithMessage($"Maximum {ValidationConstants.MaxTags} tags allowed.");
    }
}
