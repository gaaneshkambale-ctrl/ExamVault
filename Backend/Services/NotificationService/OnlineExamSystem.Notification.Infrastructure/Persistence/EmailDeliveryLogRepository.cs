using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class EmailDeliveryLogRepository : IEmailDeliveryLogRepository
{
    private readonly NotificationDbContext _dbContext;

    public EmailDeliveryLogRepository(NotificationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task LogAsync(string toEmail, string subject, bool success, string? errorMessage, CancellationToken cancellationToken = default)
    {
        _dbContext.EmailDeliveryLogs.Add(new EmailDeliveryLog
        {
            ToEmail = toEmail,
            Subject = subject,
            Success = success,
            ErrorMessage = errorMessage,
        });
        await _dbContext.SaveChangesAsync(cancellationToken);
    }

    public async Task<EmailDeliverySummary> GetTodaySummaryAsync(CancellationToken cancellationToken = default)
    {
        var todayUtc = DateTime.UtcNow.Date;
        var rows = await _dbContext.EmailDeliveryLogs
            .Where(l => l.CreatedAtUtc >= todayUtc)
            .Select(l => l.Success)
            .ToListAsync(cancellationToken);

        var delivered = rows.Count(success => success);
        return new EmailDeliverySummary(rows.Count, delivered, rows.Count - delivered);
    }
}
