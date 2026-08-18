using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddMultipleMonitorsSetting : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "MultipleMonitorsEnabled",
                table: "ProctoringSettings",
                type: "bit",
                nullable: false,
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MultipleMonitorsEnabled",
                table: "ProctoringSettings");
        }
    }
}
