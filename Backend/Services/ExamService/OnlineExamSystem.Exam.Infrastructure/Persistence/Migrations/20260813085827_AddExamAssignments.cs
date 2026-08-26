using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ExamAssignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    AssignmentNumber = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExamId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetType = table.Column<int>(type: "int", nullable: false),
                    GroupId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    StartAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TimeZoneId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    MaxAttempts = table.Column<int>(type: "int", nullable: false),
                    AllowLateJoin = table.Column<bool>(type: "bit", nullable: false),
                    GraceTimeMinutes = table.Column<int>(type: "int", nullable: false),
                    ShowInstructions = table.Column<bool>(type: "bit", nullable: false),
                    ShowResultsAfterSubmit = table.Column<bool>(type: "bit", nullable: false),
                    ShowCorrectAnswers = table.Column<bool>(type: "bit", nullable: false),
                    AllowReviewAfterSubmit = table.Column<bool>(type: "bit", nullable: false),
                    AutoSubmitOnTimeOver = table.Column<bool>(type: "bit", nullable: false),
                    EnableProctoring = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamAssignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamAssignments_Exams_ExamId",
                        column: x => x.ExamId,
                        principalTable: "Exams",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ExamAssignmentTargets",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ExamAssignmentId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamAssignmentTargets", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ExamAssignmentTargets_ExamAssignments_ExamAssignmentId",
                        column: x => x.ExamAssignmentId,
                        principalTable: "ExamAssignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ExamAssignments_AssignmentNumber",
                table: "ExamAssignments",
                column: "AssignmentNumber",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExamAssignments_ExamId",
                table: "ExamAssignments",
                column: "ExamId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamAssignmentTargets_ExamAssignmentId_UserId",
                table: "ExamAssignmentTargets",
                columns: new[] { "ExamAssignmentId", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ExamAssignmentTargets");

            migrationBuilder.DropTable(
                name: "ExamAssignments");
        }
    }
}
