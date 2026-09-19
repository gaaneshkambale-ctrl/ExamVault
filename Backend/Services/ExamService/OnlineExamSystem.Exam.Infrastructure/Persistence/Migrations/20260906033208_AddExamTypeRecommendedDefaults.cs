using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamTypeRecommendedDefaults : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AutoSubmitEnabled",
                table: "ExamTypes",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultDurationMinutes",
                table: "ExamTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "DefaultMaxAttempts",
                table: "ExamTypes",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NegativeMarkingEnabled",
                table: "ExamTypes",
                type: "bit",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "NegativeMarkingValue",
                table: "ExamTypes",
                type: "decimal(5,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "PassingScorePercent",
                table: "ExamTypes",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AutoSubmitEnabled",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "DefaultDurationMinutes",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "DefaultMaxAttempts",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "NegativeMarkingEnabled",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "NegativeMarkingValue",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "PassingScorePercent",
                table: "ExamTypes");
        }
    }
}
