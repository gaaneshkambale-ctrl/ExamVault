using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Submission.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMultipleMonitorsCount : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MultipleMonitorsCount",
                table: "ExamAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MultipleMonitorsCount",
                table: "ExamAttempts");
        }
    }
}
