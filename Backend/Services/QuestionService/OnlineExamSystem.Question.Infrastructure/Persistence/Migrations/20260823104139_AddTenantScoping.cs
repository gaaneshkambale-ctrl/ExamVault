using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Question.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantScoping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Questions",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "QuestionOptions",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.CreateIndex(
                name: "IX_Questions_TenantId",
                table: "Questions",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Questions_TenantId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Questions");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "QuestionOptions");
        }
    }
}
