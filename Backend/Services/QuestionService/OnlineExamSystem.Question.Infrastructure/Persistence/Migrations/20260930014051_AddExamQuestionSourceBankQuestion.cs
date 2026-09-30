using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Question.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddExamQuestionSourceBankQuestion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "SourceBankQuestionId",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Questions_SourceBankQuestionId",
                table: "Questions",
                column: "SourceBankQuestionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Questions_SourceBankQuestionId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "SourceBankQuestionId",
                table: "Questions");
        }
    }
}
