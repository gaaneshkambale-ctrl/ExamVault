using Microsoft.EntityFrameworkCore;
using OnlineExamSystem.Notification.Application.Interfaces;
using OnlineExamSystem.Notification.Domain.Entities;

namespace OnlineExamSystem.Notification.Infrastructure.Persistence;

public class NewsletterSubscriberRepository : INewsletterSubscriberRepository
{
    private readonly NotificationDbContext _dbContext;

    public NewsletterSubscriberRepository(NotificationDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task SubscribeAsync(string email, CancellationToken cancellationToken = default)
    {
        var alreadySubscribed = await _dbContext.NewsletterSubscribers
            .AnyAsync(s => s.Email == email, cancellationToken);
        if (alreadySubscribed)
        {
            return;
        }

        _dbContext.NewsletterSubscribers.Add(new NewsletterSubscriber { Email = email });
        try
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Two concurrent submits for the same email both passed the check
            // above - the unique index caught the second insert, which is
            // exactly the same "already subscribed" outcome as the early
            // return, not a real error.
        }
    }
}
