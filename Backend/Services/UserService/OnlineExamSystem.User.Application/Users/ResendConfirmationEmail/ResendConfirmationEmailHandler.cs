using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.Shared.Common.Multitenancy;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.ResendConfirmationEmail;

// A second attempt at RegisterUserHandler's own confirmation email, for
// when the first one expired unused (24h) or never arrived. Self-registered
// users always land in the Default tenant (no subdomain to resolve, see
// RegisterUserHandler), so unlike ForgotPasswordHandler this never needs a
// TenantSlug. Same "never reveal whether this exists" principle
// ForgotPasswordHandler documents for itself.
public class ResendConfirmationEmailHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IValidator<ResendConfirmationEmailCommand> _validator;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailDispatcher _emailDispatcher;
    private readonly ITenantUrlBuilder _tenantUrlBuilder;
    private readonly ILogger<ResendConfirmationEmailHandler> _logger;

    private static readonly TimeSpan ConfirmationTokenLifetime = TimeSpan.FromHours(24);

    public ResendConfirmationEmailHandler(
        IUserRepository userRepository,
        IValidator<ResendConfirmationEmailCommand> validator,
        IJwtTokenService jwtTokenService,
        IEmailDispatcher emailDispatcher,
        ITenantUrlBuilder tenantUrlBuilder,
        ILogger<ResendConfirmationEmailHandler> logger)
    {
        _userRepository = userRepository;
        _validator = validator;
        _jwtTokenService = jwtTokenService;
        _emailDispatcher = emailDispatcher;
        _tenantUrlBuilder = tenantUrlBuilder;
        _logger = logger;
    }

    public async Task<ResendConfirmationEmailResult> HandleAsync(
        ResendConfirmationEmailCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ResendConfirmationEmailResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        var user = await _userRepository.GetByEmailAsync(command.Email, TenantConstants.DefaultTenantId, cancellationToken);
        if (user is null || user.EmailConfirmed)
        {
            return ResendConfirmationEmailResult.Ok();
        }

        var rawToken = _jwtTokenService.GenerateRefreshToken();
        await _userRepository.AddEmailConfirmationTokenAsync(new EmailConfirmationToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(rawToken),
            ExpiresAtUtc = DateTime.UtcNow.Add(ConfirmationTokenLifetime),
        }, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        var confirmUrl = _tenantUrlBuilder.GetConfirmEmailUrl(tenantSlug: null, isActive: true, rawToken);
        var emailSent = await _emailDispatcher.SendAsync(
            toEmail: user.Email,
            toName: user.FullName,
            subject: "Confirm your ExamVault account",
            body: "Here's a fresh confirmation link for your ExamVault account.\n\n" +
                  $"Confirm your email: {confirmUrl}\n\n" +
                  "This link expires in 24 hours and can only be used once. " +
                  "If you didn't request this, you can safely ignore this email.\n\n" +
                  "Thanks & Regards,\nExamVault",
            loginUrl: confirmUrl,
            tenantSlug: null,
            cancellationToken: cancellationToken);
        if (!emailSent)
        {
            _logger.LogWarning("Resent confirmation email failed to send for user {UserId}.", user.Id);
        }

        return ResendConfirmationEmailResult.Ok();
    }
}
