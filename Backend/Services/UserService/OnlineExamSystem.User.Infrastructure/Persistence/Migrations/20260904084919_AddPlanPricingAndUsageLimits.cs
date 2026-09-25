using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlanPricingAndUsageLimits : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "MaxAdmins",
                table: "Tenants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxInstructors",
                table: "Tenants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "AnnualPrice",
                table: "Plans",
                type: "decimal(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxAdmins",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxAiQuestionsPerMonth",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxExams",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxInstructors",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxQuestions",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxStudents",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MonthlyPrice",
                table: "Plans",
                type: "decimal(10,2)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StorageGb",
                table: "Plans",
                type: "int",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Plans",
                keyColumn: "Id",
                keyValue: new Guid("33333333-3333-3333-3333-333333333333"),
                columns: new[] { "AnnualPrice", "MaxAdmins", "MaxAiQuestionsPerMonth", "MaxExams", "MaxInstructors", "MaxQuestions", "MaxStudents", "MonthlyPrice", "StorageGb" },
                values: new object[] { null, null, null, null, null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "MaxAdmins", "MaxInstructors" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "MaxAdmins", "MaxInstructors" },
                values: new object[] { null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MaxAdmins",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "MaxInstructors",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "AnnualPrice",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxAdmins",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxAiQuestionsPerMonth",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxExams",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxInstructors",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxQuestions",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MaxStudents",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "MonthlyPrice",
                table: "Plans");

            migrationBuilder.DropColumn(
                name: "StorageGb",
                table: "Plans");
        }
    }
}
