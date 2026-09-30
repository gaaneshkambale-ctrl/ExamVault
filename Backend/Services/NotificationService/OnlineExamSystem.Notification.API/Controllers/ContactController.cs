using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Infrastructure.Email;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;

namespace OnlineExamSystem.Notification.API.Controllers;

// Public marketing-site contact form - deliberately anonymous (no
// [Authorize]), same pattern as UserService's Register/Login. Sends
// through the existing "notify" n8n webhook rather than a new one, so no
// extra n8n workflow configuration is needed on the user's instance -
// email is a best-effort side channel here too (see N8nEmailDispatcher),
// so a delivery hiccup doesn't turn into a 500 for someone who just
// submitted a contact form.
[ApiController]
[Route("api/contact")]
public class ContactController : ControllerBase
{
    private const string SupportEmail = "support@examvaults.in";

    private readonly IEmailDispatcher _emailDispatcher;

    public ContactController(IEmailDispatcher emailDispatcher)
    {
        _emailDispatcher = emailDispatcher;
    }

    [HttpPost]
    public async Task<IActionResult> Submit(ContactMessageRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Message))
        {
            return BadRequest(new { message = "Name, email, and message are all required." });
        }

        if (!new EmailAddressAttribute().IsValid(request.Email))
        {
            return BadRequest(new { message = "Please provide a valid email address." });
        }

        var correlationId = Guid.NewGuid();

        await _emailDispatcher.SendAsync(
            SupportEmail,
            "ExamVault Support",
            $"New contact inquiry from {request.Name}",
            $"Name: {request.Name}\nEmail: {request.Email}\n\nMessage:\n{request.Message}",
            "Contact",
            correlationId,
            cancellationToken);

        await _emailDispatcher.SendAsync(
            request.Email,
            request.Name,
            "We've received your message",
            $"Hi {request.Name},\n\nThanks for reaching out to ExamVault! We've received your message and our team will contact you soon.\n\nYour message:\n{request.Message}",
            "Contact",
            correlationId,
            cancellationToken);

        return Ok(new { message = "Thanks for reaching out! We'll get back to you soon." });
    }
}
