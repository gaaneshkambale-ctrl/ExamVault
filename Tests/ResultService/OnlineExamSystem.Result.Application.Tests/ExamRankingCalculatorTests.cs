using OnlineExamSystem.Result.Application.Scoring;
using Xunit;

namespace OnlineExamSystem.Result.Application.Tests;

public class ExamRankingCalculatorTests
{
    private static RankableAttempt Attempt(Guid userId, decimal score, DateTime submittedAtUtc, Guid? attemptId = null) =>
        new(attemptId ?? Guid.NewGuid(), userId, submittedAtUtc, score);

    [Fact]
    public void Highest_score_gets_rank_one_and_top_percentile()
    {
        var now = DateTime.UtcNow;
        var top = Attempt(Guid.NewGuid(), 90, now);
        var attempts = new[]
        {
            top,
            Attempt(Guid.NewGuid(), 70, now),
            Attempt(Guid.NewGuid(), 50, now),
        };

        var rankings = ExamRankingCalculator.Compute(attempts);

        Assert.Equal(1, rankings[top.AttemptId].Rank);
        Assert.Equal(3, rankings[top.AttemptId].TotalParticipants);
        // Percentile-rank convention: share of the REST of the cohort you
        // beat (below / (n-1)) - the top scorer beats both others, so 100.
        Assert.Equal(100.0, rankings[top.AttemptId].Percentile);
    }

    [Fact]
    public void Lowest_score_gets_zero_percentile()
    {
        var now = DateTime.UtcNow;
        var bottom = Attempt(Guid.NewGuid(), 50, now);
        var attempts = new[] { Attempt(Guid.NewGuid(), 90, now), Attempt(Guid.NewGuid(), 70, now), bottom };

        var rankings = ExamRankingCalculator.Compute(attempts);

        Assert.Equal(0.0, rankings[bottom.AttemptId].Percentile);
    }

    [Fact]
    public void Tied_scores_share_rank_and_next_rank_skips()
    {
        var now = DateTime.UtcNow;
        var firstTied = Attempt(Guid.NewGuid(), 80, now);
        var secondTied = Attempt(Guid.NewGuid(), 80, now);
        var third = Attempt(Guid.NewGuid(), 60, now);
        var attempts = new[] { firstTied, secondTied, third };

        var rankings = ExamRankingCalculator.Compute(attempts);

        Assert.Equal(1, rankings[firstTied.AttemptId].Rank);
        Assert.Equal(1, rankings[secondTied.AttemptId].Rank);
        // Standard competition ranking: two people tied for 1st, so the next
        // distinct score is rank 3, not rank 2.
        Assert.Equal(3, rankings[third.AttemptId].Rank);
    }

    [Fact]
    public void Only_the_latest_attempt_per_user_counts()
    {
        var now = DateTime.UtcNow;
        var userId = Guid.NewGuid();
        var earlierHighScore = Attempt(userId, 95, now.AddMinutes(-10));
        var laterLowerScore = Attempt(userId, 40, now);
        var otherUser = Attempt(Guid.NewGuid(), 70, now);
        var attempts = new[] { earlierHighScore, laterLowerScore, otherUser };

        var rankings = ExamRankingCalculator.Compute(attempts);

        // The earlier, superseded attempt gets no ranking entry at all.
        Assert.False(rankings.ContainsKey(earlierHighScore.AttemptId));
        // The later attempt (lower score) is what actually counts, and it
        // ranks below the other user's 70.
        Assert.True(rankings.ContainsKey(laterLowerScore.AttemptId));
        Assert.Equal(2, rankings[laterLowerScore.AttemptId].Rank);
        Assert.Equal(2, rankings[laterLowerScore.AttemptId].TotalParticipants);
    }

    [Fact]
    public void Single_participant_gets_rank_one_and_full_percentile()
    {
        var attempts = new[] { Attempt(Guid.NewGuid(), 55, DateTime.UtcNow) };

        var rankings = ExamRankingCalculator.Compute(attempts);

        var only = rankings.Values.Single();
        Assert.Equal(1, only.Rank);
        Assert.Equal(1, only.TotalParticipants);
        Assert.Equal(100.0, only.Percentile);
    }
}
