using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantScoping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Sections",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ReminderSettings",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ProctoringSettings",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "GeneralSettings",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Exams",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ExamReminderLogs",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ExamDefaults",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ExamAssignmentTargets",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ExamAssignments",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants) -
                // Exam Service has no local Tenants table/FK to enforce this, so getting the
                // literal right here is the only thing standing between these rows and being
                // permanently invisible under the new query filter.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.CreateIndex(
                name: "IX_Sections_TenantId",
                table: "Sections",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ReminderSettings_TenantId",
                table: "ReminderSettings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ProctoringSettings_TenantId",
                table: "ProctoringSettings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_GeneralSettings_TenantId",
                table: "GeneralSettings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Exams_TenantId",
                table: "Exams",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamDefaults_TenantId",
                table: "ExamDefaults",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamAssignments_TenantId",
                table: "ExamAssignments",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Sections_TenantId",
                table: "Sections");

            migrationBuilder.DropIndex(
                name: "IX_ReminderSettings_TenantId",
                table: "ReminderSettings");

            migrationBuilder.DropIndex(
                name: "IX_ProctoringSettings_TenantId",
                table: "ProctoringSettings");

            migrationBuilder.DropIndex(
                name: "IX_GeneralSettings_TenantId",
                table: "GeneralSettings");

            migrationBuilder.DropIndex(
                name: "IX_Exams_TenantId",
                table: "Exams");

            migrationBuilder.DropIndex(
                name: "IX_ExamDefaults_TenantId",
                table: "ExamDefaults");

            migrationBuilder.DropIndex(
                name: "IX_ExamAssignments_TenantId",
                table: "ExamAssignments");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Sections");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ReminderSettings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ProctoringSettings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "GeneralSettings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Exams");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ExamReminderLogs");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ExamDefaults");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ExamAssignmentTargets");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ExamAssignments");
        }
    }
}
