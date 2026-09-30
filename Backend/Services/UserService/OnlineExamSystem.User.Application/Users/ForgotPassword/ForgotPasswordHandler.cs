using FluentValidation;
using Microsoft.Extensions.Logging;
using OnlineExamSystem.User.Application.Interfaces;
using OnlineExamSystem.User.Domain.Entities;

namespace OnlineExamSystem.User.Application.Users.ForgotPassword;

// Self-service "forgot password" - a public, unauthenticated action, unlike
// ResetTenantAdminPasswordHandler (a Super Admin support action requiring an
// authenticated caller). Same "never reveal whether this exists" principle
// LoginUserHandler already documents for its own tenant/email lookups: every
// path below - unknown tenant slug, unknown email, inactive account - falls
// through to the exact same generic Ok() the real, email-sent case returns,
// so a caller can never tell which case they hit.
public class ForgotPasswordHandler
{
    private readonly IUserRepository _userRepository;
    private readonly ITenantRepository _tenantRepository;
    private readonly IValidator<ForgotPasswordCommand> _validator;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailDispatcher _emailDispatcher;
    private readonly ITenantUrlBuilder _tenantUrlBuilder;
    private readonly ILogger<ForgotPasswordHandler> _logger;

    private static readonly TimeSpan TokenLifetime = TimeSpan.FromMinutes(30);

    public ForgotPasswordHandler(
        IUserRepository userRepository,
        ITenantRepository tenantRepository,
        IValidator<ForgotPasswordCommand> validator,
        IJwtTokenService jwtTokenService,
        IEmailDispatcher emailDispatcher,
        ITenantUrlBuilder tenantUrlBuilder,
        ILogger<ForgotPasswordHandler> logger)
    {
        _userRepository = userRepository;
        _tenantRepository = tenantRepository;
        _validator = validator;
        _jwtTokenService = jwtTokenService;
        _emailDispatcher = emailDispatcher;
        _tenantUrlBuilder = tenantUrlBuilder;
        _logger = logger;
    }

    public async Task<ForgotPasswordResult> HandleAsync(
        ForgotPasswordCommand command,
        CancellationToken cancellationToken = default)
    {
        var validationResult = await _validator.ValidateAsync(command, cancellationToken);
        if (!validationResult.IsValid)
        {
            return ForgotPasswordResult.Invalid(validationResult.Errors.Select(e => e.ErrorMessage).ToList());
        }

        Guid? tenantId = null;
        Tenant? tenant = null;
        if (!string.IsNullOrWhiteSpace(command.TenantSlug))
        {
            tenant = await _tenantRepository.GetBySlugAsync(command.TenantSlug, cancellationToken);
            if (tenant is null || !tenant.IsActive)
            {
                return ForgotPasswordResult.Ok();
            }

            tenantId = tenant.Id;
        }

        var user = await _userRepository.GetByEmailAsync(command.Email, tenantId, cancellationToken);
        if (user is null || !user.IsActive)
        {
            return ForgotPasswordResult.Ok();
        }

        tenant ??= await _tenantRepository.GetByIdAsync(user.TenantId, cancellationToken);

        var rawToken = _jwtTokenService.GenerateRefreshToken();
        await _userRepository.AddPasswordResetTokenAsync(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = _jwtTokenService.HashToken(rawToken),
            ExpiresAtUtc = DateTime.UtcNow.Add(TokenLifetime),
        }, cancellationToken);
        await _userRepository.SaveChangesAsync(cancellationToken);

        var resetUrl = _tenantUrlBuilder.GetResetPasswordUrl(tenant?.Slug, tenant?.IsActive ?? true, rawToken);
        var emailSent = await _emailDispatcher.SendAsync(
            toEmail: user.Email,
            toName: user.FullName,
            subject: "Reset your ExamVault password",
            // No leading "Hello {name}," here - the n8n email template
            // already renders its own greeting from toName, same convention
            // ResetTenantAdminPasswordHandler's own email body follows.
            body: "We received a request to reset your ExamVault password.\n\n" +
                  $"Reset link: {resetUrl}\n\n" +
                  "This link expires in 30 minutes and can only be used once. " +
                  "If you didn't request this, you can safely ignore this email - your password will stay unchanged.\n\n" +
                  "Thanks & Regards,\nExamVault",
            loginUrl: resetUrl,
            tenantSlug: tenant?.Slug,
            cancellationToken: cancellationToken);
        if (!emailSent)
        {
            _logger.LogWarning("Forgot-password email failed to send for user {UserId}.", user.Id);
        }

        return ForgotPasswordResult.Ok();
    }
}
