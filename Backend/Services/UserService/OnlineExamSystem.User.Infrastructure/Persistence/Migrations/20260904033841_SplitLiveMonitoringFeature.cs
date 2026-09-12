using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SplitLiveMonitoringFeature : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "IncludedFeatures",
                value: "Users,Exams,ExamTypes,LiveMonitoring,Results,Reports,Notifications,Settings,ExamSecurity,Proctoring");

            // Backward compatibility for every OTHER Plan (not the seeded
            // Full-Access row above, already handled by UpdateData): a Plan
            // that already had LiveMonitoring granted the whole bundle
            // (Active Exams/Student Attempts/Security Violations/camera
            // Proctoring) under the old single-feature model. Narrowing
            // LiveMonitoring's meaning must not silently strip Security
            // Violations or Proctoring access any organization already had
            // - so append both new features wherever LiveMonitoring is
            // present, unless already there. Comma-wrapped LIKE avoids a
            // false match on a hypothetical future feature name that merely
            // contains "LiveMonitoring" as a substring.
            migrationBuilder.Sql(@"
                UPDATE Plans
                SET IncludedFeatures = IncludedFeatures + ',ExamSecurity,Proctoring'
                WHERE Id <> '33333333-3333-3333-3333-333333333333'
                  AND ',' + IncludedFeatures + ',' LIKE '%,LiveMonitoring,%'
                  AND ',' + IncludedFeatures + ',' NOT LIKE '%,ExamSecurity,%'
                  AND ',' + IncludedFeatures + ',' NOT LIKE '%,Proctoring,%';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Best-effort reversal, mirroring Up()'s own condition - strips
            // ExamSecurity/Proctoring from any Plan that also has
            // LiveMonitoring. Not perfectly reversible (a plan that
            // independently had ExamSecurity/Proctoring granted before this
            // migration, without also having LiveMonitoring, is untouched
            // either way, so no data is lost there) - acceptable since
            // neither feature existed before this migration, so that case
            // cannot occur on a real database.
            migrationBuilder.Sql(@"
                UPDATE Plans
                SET IncludedFeatures = REPLACE(REPLACE(IncludedFeatures, ',ExamSecurity', ''), ',Proctoring', '')
                WHERE Id <> '33333333-3333-3333-3333-333333333333'
                  AND ',' + IncludedFeatures + ',' LIKE '%,LiveMonitoring,%';
            ");

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                column: "IncludedFeatures",
                value: "Users,Exams,ExamTypes,LiveMonitoring,Results,Reports,Notifications,Settings");
        }
    }
}
