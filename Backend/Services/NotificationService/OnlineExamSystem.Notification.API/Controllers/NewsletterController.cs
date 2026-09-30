using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Shared.Contracts.Requests.Notification;

namespace OnlineExamSystem.Notification.API.Controllers;

// Public marketing-site newsletter signup (Footer.tsx's "Stay Updated" form)
// - deliberately anonymous, same pattern as ContactController.
[ApiController]
[Route("api/newsletter")]
public class NewsletterController : ControllerBase
{
    private readonly INewsletterSubscriberRepository _repository;

    public NewsletterController(INewsletterSubscriberRepository repository)
    {
        _repository = repository;
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe(NewsletterSubscribeRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || !new EmailAddressAttribute().IsValid(request.Email))
        {
            return BadRequest(new { message = "Please provide a valid email address." });
        }

        await _repository.SubscribeAsync(request.Email.Trim(), cancellationToken);

        return Ok(new { message = "Thanks for subscribing!" });
    }
}
