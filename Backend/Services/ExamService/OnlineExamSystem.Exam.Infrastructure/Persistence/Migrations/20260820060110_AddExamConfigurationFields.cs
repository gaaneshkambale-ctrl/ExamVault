using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamConfigurationFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowCalculator",
                table: "Exams",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AllowNotes",
                table: "Exams",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "AutoSubmitOnTimeEnd",
                table: "Exams",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ConfirmBeforeSubmit",
                table: "Exams",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowSectionSummaryToStudents",
                table: "Exams",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowCalculator",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "AllowNotes",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "AutoSubmitOnTimeEnd",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ConfirmBeforeSubmit",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ShowSectionSummaryToStudents",
                table: "Exams");
        }
    }
}
