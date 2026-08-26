using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Submission.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddAnswerTextAndGradingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AnswerText",
                table: "AttemptAnswers",
                type: "nvarchar(4000)",
                maxLength: 4000,
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "GradedAtUtc",
                table: "AttemptAnswers",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "GradedByUserId",
                table: "AttemptAnswers",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MarksAwarded",
                table: "AttemptAnswers",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnswerText",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "GradedAtUtc",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "GradedByUserId",
                table: "AttemptAnswers");

            migrationBuilder.DropColumn(
                name: "MarksAwarded",
                table: "AttemptAnswers");
        }
    }
}
