using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamReminderLog : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExamReminderLogs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Window = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamReminderLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamReminderLogs_ExamAssignments_AssignmentId",
                        column: x => x.AssignmentId,
                        principalTable: "ExamAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExamReminderLogs_AssignmentId_UserId_Window",
                table: "ExamReminderLogs",
                columns: new[] { "AssignmentId", "UserId", "Window" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExamReminderLogs");
        }
    }
}
