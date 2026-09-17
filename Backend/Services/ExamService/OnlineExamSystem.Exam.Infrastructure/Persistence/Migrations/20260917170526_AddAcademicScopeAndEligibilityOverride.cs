using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAcademicScopeAndEligibilityOverride : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RestrictToAcademicScope",
                table: "Exams",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsEligibilityOverride",
                table: "ExamAssignmentTargets",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "OverrideReason",
                table: "ExamAssignmentTargets",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RestrictToAcademicScope",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "IsEligibilityOverride",
                table: "ExamAssignmentTargets");

            migrationBuilder.DropColumn(
                name: "OverrideReason",
                table: "ExamAssignmentTargets");
        }
    }
}
