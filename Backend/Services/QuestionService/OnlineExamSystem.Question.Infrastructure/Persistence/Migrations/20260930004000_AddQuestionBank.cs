using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Question.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionBank : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BankSubjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankSubjects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BankTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankTags", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "BankTopics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankTopics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankTopics_BankSubjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "BankSubjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BankQuestions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TopicId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    QuestionType = table.Column<int>(type: "int", nullable: false),
                    QuestionText = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    DefaultMarks = table.Column<int>(type: "int", nullable: false),
                    NegativeMarks = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    ShuffleOptions = table.Column<bool>(type: "bit", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankQuestions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankQuestions_BankSubjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "BankSubjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_BankQuestions_BankTopics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "BankTopics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "BankQuestionOptions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OptionText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false),
                    DisplayOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankQuestionOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankQuestionOptions_BankQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "BankQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "BankQuestionTags",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TagId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TenantId = table.Column<Guid>(type: "uniqueidentifier", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BankQuestionTags", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BankQuestionTags_BankQuestions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "BankQuestions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_BankQuestionTags_BankTags_TagId",
                        column: x => x.TagId,
                        principalTable: "BankTags",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_BankQuestionOptions_QuestionId",
                table: "BankQuestionOptions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_BankQuestions_SubjectId",
                table: "BankQuestions",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_BankQuestions_TenantId_Status",
                table: "BankQuestions",
                columns: new[] { "TenantId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_BankQuestions_TenantId_SubjectId_TopicId",
                table: "BankQuestions",
                columns: new[] { "TenantId", "SubjectId", "TopicId" });

            migrationBuilder.CreateIndex(
                name: "IX_BankQuestions_TopicId",
                table: "BankQuestions",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_BankQuestionTags_QuestionId_TagId",
                table: "BankQuestionTags",
                columns: new[] { "QuestionId", "TagId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankQuestionTags_TagId",
                table: "BankQuestionTags",
                column: "TagId");

            migrationBuilder.CreateIndex(
                name: "IX_BankSubjects_TenantId_Name",
                table: "BankSubjects",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankTags_TenantId_Name",
                table: "BankTags",
                columns: new[] { "TenantId", "Name" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_BankTopics_SubjectId",
                table: "BankTopics",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_BankTopics_TenantId_SubjectId_Name",
                table: "BankTopics",
                columns: new[] { "TenantId", "SubjectId", "Name" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "BankQuestionOptions");

            migrationBuilder.DropTable(
                name: "BankQuestionTags");

            migrationBuilder.DropTable(
                name: "BankQuestions");

            migrationBuilder.DropTable(
                name: "BankTags");

            migrationBuilder.DropTable(
                name: "BankTopics");

            migrationBuilder.DropTable(
                name: "BankSubjects");
        }
    }
}
