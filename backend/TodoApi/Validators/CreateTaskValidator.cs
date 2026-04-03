using FluentValidation;
using TodoApi.DTOs;

namespace TodoApi.Validators;

/// <summary>Validates the <see cref="CreateTaskDto"/> request body.</summary>
public class CreateTaskValidator : AbstractValidator<CreateTaskDto>
{
    public CreateTaskValidator()
    {
        RuleFor(x => x.Title)
            .NotEmpty().WithMessage("Title is required.")
            .MaximumLength(ValidationConstants.TitleMaxLength).WithMessage($"Title must not exceed {ValidationConstants.TitleMaxLength} characters.");

        RuleFor(x => x.Description)
            .MaximumLength(ValidationConstants.DescriptionMaxLength).WithMessage($"Description must not exceed {ValidationConstants.DescriptionMaxLength} characters.");

        RuleFor(x => x.Notes)
            .MaximumLength(ValidationConstants.NotesMaxLength).WithMessage($"Notes must not exceed {ValidationConstants.NotesMaxLength:N0} characters.");

        RuleFor(x => x.Url)
            .MaximumLength(ValidationConstants.UrlMaxLength).WithMessage($"URL must not exceed {ValidationConstants.UrlMaxLength} characters.")
            .Must(u => u == null || Uri.TryCreate(u, UriKind.Absolute, out _))
            .WithMessage("URL must be a valid absolute URL.");

        RuleFor(x => x.Priority)
            .IsInEnum().WithMessage("Invalid priority value.");

        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(DateTime.UtcNow.Date)
            .When(x => x.DueDate.HasValue)
            .WithMessage("Due date must be today or in the future.");

        RuleFor(x => x.Tags)
            .Must(t => t == null || t.Length <= ValidationConstants.MaxTags)
            .WithMessage($"Maximum {ValidationConstants.MaxTags} tags allowed.");
    }
}
