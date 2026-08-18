using OnlineExamSystem.User.Application.Interfaces;

namespace OnlineExamSystem.User.Application.Users.GetMySessions;

public class GetMySessionsHandler
{
    private readonly IUserRepository _userRepository;
    private readonly IJwtTokenService _jwtTokenService;

    public GetMySessionsHandler(IUserRepository userRepository, IJwtTokenService jwtTokenService)
    {
        _userRepository = userRepository;
        _jwtTokenService = jwtTokenService;
    }

    public async Task<IReadOnlyList<MySessionItem>> HandleAsync(
        GetMySessionsQuery query,
        CancellationToken cancellationToken = default)
    {
        var currentHash = string.IsNullOrWhiteSpace(query.CurrentRefreshToken)
            ? null
            : _jwtTokenService.HashToken(query.CurrentRefreshToken);

        var sessions = await _userRepository.GetRefreshTokensByUserIdAsync(query.UserId, cancellationToken);

        return sessions.Select(token =>
        {
            var status = token.RevokedAtUtc is not null
                ? "Revoked"
                : token.ExpiresAtUtc <= DateTime.UtcNow
                    ? "Expired"
                    : "Active";

            return new MySessionItem(
                token.Id,
                token.DeviceLabel ?? "Unknown device",
                token.CreatedAtUtc,
                token.ExpiresAtUtc,
                token.RevokedAtUtc,
                status,
                currentHash is not null && token.TokenHash == currentHash);
        }).ToList();
    }
}
