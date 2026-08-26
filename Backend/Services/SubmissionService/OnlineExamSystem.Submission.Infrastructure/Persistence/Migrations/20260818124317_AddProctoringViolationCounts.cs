using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Submission.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProctoringViolationCounts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CopyPasteCount",
                table: "ExamAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MultipleFacesDetectedCount",
                table: "ExamAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "MultipleTabsCount",
                table: "ExamAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "NoFaceDetectedCount",
                table: "ExamAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RightClickCount",
                table: "ExamAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "TabSwitchCount",
                table: "ExamAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CopyPasteCount",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "MultipleFacesDetectedCount",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "MultipleTabsCount",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "NoFaceDetectedCount",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "RightClickCount",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "TabSwitchCount",
                table: "ExamAttempts");
        }
    }
}
