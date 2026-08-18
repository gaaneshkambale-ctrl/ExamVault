using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddProctoringSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ProctoringSettings",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ProctoringEnabled = table.Column<bool>(type: "bit", nullable: false),
                    FaceDetectionEnabled = table.Column<bool>(type: "bit", nullable: false),
                    MultiPersonDetectionEnabled = table.Column<bool>(type: "bit", nullable: false),
                    ScreenMonitoringEnabled = table.Column<bool>(type: "bit", nullable: false),
                    FullscreenExitEnabled = table.Column<bool>(type: "bit", nullable: false),
                    MultipleTabsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CopyPasteBlockingEnabled = table.Column<bool>(type: "bit", nullable: false),
                    RightClickBlockingEnabled = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProctoringSettings", x => x.Id);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ProctoringSettings");
        }
    }
}
