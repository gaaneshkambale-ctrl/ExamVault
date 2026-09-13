namespace OnlineExamSystem.Result.Application.Scoring;

public record RankableAttempt(Guid AttemptId, Guid UserId, DateTime SubmittedAtUtc, decimal Score);

public record AttemptRanking(int Rank, double Percentile, int TotalParticipants);

/// <summary>Computes Rank/Percentile across every student's attempt on one
/// exam - Admin-report-only for now (see ActionPlan.txt's Result Engine
/// phase note): a student's own result can't safely compute this themselves,
/// since it would require ResultService to fetch every other student's raw
/// attempt via the Admin/Instructor-only by-exam endpoint using the
/// student's own token, which real service-to-service auth doesn't exist
/// for yet.
///
/// A student with multiple attempts is represented by their LATEST
/// submitted attempt only (explicit product decision, not the highest-
/// scoring one) - only that attempt's AttemptId gets a ranking entry;
/// earlier, superseded attempts by the same student get none.</summary>
public static class ExamRankingCalculator
{
    public static IReadOnlyDictionary<Guid, AttemptRanking> Compute(IReadOnlyList<RankableAttempt> attempts)
    {
        var latestPerUser = attempts
            .GroupBy(a => a.UserId)
            .Select(g => g.OrderByDescending(a => a.SubmittedAtUtc).First())
            .ToList();

        var total = latestPerUser.Count;
        var result = new Dictionary<Guid, AttemptRanking>();
        foreach (var attempt in latestPerUser)
        {
            // Standard competition ranking (1224): everyone strictly above
            // you counts toward your rank number, so tied scores share the
            // same rank and the next distinct score skips accordingly.
            // Matches computeRank in Frontend/.../utils/examResultScheme.ts
            // exactly - that's the pre-existing client-side implementation
            // already live on the Admin Advance Exam Report for certain exam
            // types (Competitive/Entrance/Recruitment); this server-side
            // version must never disagree with it.
            var rank = 1 + latestPerUser.Count(a => a.Score > attempt.Score);
            // Percentile-rank convention (share of the REST of the cohort
            // you beat): below / (n-1), so the top scorer lands at 100 and
            // the bottom scorer at 0. Also matches computePercentile in
            // examResultScheme.ts exactly, including its n<=1 special case.
            var percentile = total <= 1
                ? 100.0
                : Math.Round(100.0 * latestPerUser.Count(a => a.Score < attempt.Score) / (total - 1), 2);
            result[attempt.AttemptId] = new AttemptRanking(rank, percentile, total);
        }

        return result;
    }
}
