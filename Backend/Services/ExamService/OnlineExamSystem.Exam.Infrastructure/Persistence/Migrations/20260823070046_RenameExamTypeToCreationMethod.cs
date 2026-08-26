using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RenameExamTypeToCreationMethod : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "ExamType",
                table: "Exams",
                newName: "CreationMethod");

            migrationBuilder.AddColumn<Guid>(
                name: "ExamTypeId",
                table: "Exams",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "ExamTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Purpose = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ExamTypes", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Exams_ExamTypeId",
                table: "Exams",
                column: "ExamTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Exams_ExamTypes_ExamTypeId",
                table: "Exams",
                column: "ExamTypeId",
                principalTable: "ExamTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Exams_ExamTypes_ExamTypeId",
                table: "Exams");

            migrationBuilder.DropTable(
                name: "ExamTypes");

            migrationBuilder.DropIndex(
                name: "IX_Exams_ExamTypeId",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "ExamTypeId",
                table: "Exams");

            migrationBuilder.RenameColumn(
                name: "CreationMethod",
                table: "Exams",
                newName: "ExamType");
        }
    }
}
