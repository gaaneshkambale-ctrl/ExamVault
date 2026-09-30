namespace OnlineExamSystem.Exam.Application.Settings.UpdateExamDefaults;

public record UpdateExamDefaultsCommand(
    int DefaultDurationMinutes,
    int PassingScorePercent,
    int DefaultMaxAttempts,
    bool NegativeMarkingEnabled,
    decimal NegativeMarkingValue,
    bool AutoSaveEnabled,
    bool AutoSubmitEnabled,
    string QuestionNavigationMode,
    string ResultPublishingMode,
    bool CertificateEnabled = false,
    int MinimumCertificateScorePercent = 80);
