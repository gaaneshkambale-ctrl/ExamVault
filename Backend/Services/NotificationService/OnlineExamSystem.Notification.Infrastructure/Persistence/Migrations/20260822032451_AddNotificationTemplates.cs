using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace OnlineExamSystem.Notification.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddNotificationTemplates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NotificationTemplates",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SendEmail = table.Column<bool>(type: "bit", nullable: false),
                    SendInApp = table.Column<bool>(type: "bit", nullable: false),
                    Subject = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Body = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NotificationTemplates", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "NotificationTemplates",
                columns: new[] { "Id", "Body", "CreatedAtUtc", "IsActive", "Name", "SendEmail", "SendInApp", "Subject", "Type", "UpdatedAtUtc" },
                values: new object[,]
                {
                    { new Guid("11111111-1111-4111-8111-111111111101"), "Hello {{studentName}},\n\nYou have been assigned the {{examTitle}}.\nPlease log in to ExamVault to view your exam schedule.\n\nExam Date: {{startDate}}   Duration: {{duration}}", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc), true, "Exam Assigned", true, true, "Your {{examTitle}} Exam is Assigned", "Exam", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-1111-4111-8111-111111111102"), "Hello {{studentName}},\n\nThis is a reminder that your {{examTitle}} exam starts on {{startDate}}.\nDuration: {{duration}}.", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc), true, "Exam Reminder", true, false, "Reminder: {{examTitle}} starts soon", "Reminder", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-1111-4111-8111-111111111103"), "Hello {{studentName}},\n\nYour results for {{examTitle}} have been published.\nLog in to ExamVault to view your score.", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc), true, "Result Published", true, true, "Your {{examTitle}} results are available", "Result", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-1111-4111-8111-111111111104"), "Hello {{studentName}},\n\n[Write your account-related message here]", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc), true, "Account Created", true, false, "Account Update", "Account", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc) },
                    { new Guid("11111111-1111-4111-8111-111111111105"), "Hello {{studentName}},\n\n[Write your announcement here]", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc), true, "System Announcement", false, true, "ExamVault Announcement", "System", new DateTime(2026, 8, 22, 12, 0, 0, 0, DateTimeKind.Utc) }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NotificationTemplates");
        }
    }
}
