using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Submission.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantScoping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ViolationEvents",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ExamAttempts",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "AttemptSectionStates",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "AttemptAnswers",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.CreateIndex(
                name: "IX_ExamAttempts_TenantId",
                table: "ExamAttempts",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExamAttempts_TenantId",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ViolationEvents");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ExamAttempts");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AttemptSectionStates");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AttemptAnswers");
        }
    }
}
