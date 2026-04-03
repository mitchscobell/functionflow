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
            .MaximumLength(200).WithMessage("Title must not exceed 200 characters.");

        RuleFor(x => x.Description)
            .MaximumLength(2000).WithMessage("Description must not exceed 2000 characters.");

        RuleFor(x => x.Notes)
            .MaximumLength(10000).WithMessage("Notes must not exceed 10,000 characters.");

        RuleFor(x => x.Url)
            .MaximumLength(2048).WithMessage("URL must not exceed 2048 characters.")
            .Must(u => u == null || Uri.TryCreate(u, UriKind.Absolute, out _))
            .WithMessage("URL must be a valid absolute URL.");

        RuleFor(x => x.Priority)
            .IsInEnum().WithMessage("Invalid priority value.");

        RuleFor(x => x.DueDate)
            .GreaterThanOrEqualTo(DateTime.UtcNow.Date)
            .When(x => x.DueDate.HasValue)
            .WithMessage("Due date must be today or in the future.");

        RuleFor(x => x.Tags)
            .Must(t => t == null || t.Length <= 10)
            .WithMessage("Maximum 10 tags allowed.");
    }
}
