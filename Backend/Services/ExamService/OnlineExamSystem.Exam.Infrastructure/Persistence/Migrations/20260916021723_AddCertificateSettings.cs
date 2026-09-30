using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCertificateSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "CertificateEnabled",
                table: "Exams",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MinimumCertificateScorePercent",
                table: "Exams",
                type: "int",
                nullable: false,
                defaultValue: 80);

            migrationBuilder.AddColumn<bool>(
                name: "CertificateEnabled",
                table: "ExamDefaults",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "MinimumCertificateScorePercent",
                table: "ExamDefaults",
                type: "int",
                nullable: false,
                defaultValue: 80);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CertificateEnabled",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "MinimumCertificateScorePercent",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "CertificateEnabled",
                table: "ExamDefaults");

            migrationBuilder.DropColumn(
                name: "MinimumCertificateScorePercent",
                table: "ExamDefaults");
        }
    }
}
