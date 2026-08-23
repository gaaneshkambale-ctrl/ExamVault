using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Notification.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTenantScoping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "SystemSettings",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "NotificationTemplates",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "Notifications",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "NotificationPreferences",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "AuditLogs",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-multi-tenancy row to User Service's seeded
                // Default tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants).
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.UpdateData(
                table: "NotificationTemplates",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-4111-8111-111111111101"),
                column: "TenantId",
                value: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.UpdateData(
                table: "NotificationTemplates",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-4111-8111-111111111102"),
                column: "TenantId",
                value: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.UpdateData(
                table: "NotificationTemplates",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-4111-8111-111111111103"),
                column: "TenantId",
                value: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.UpdateData(
                table: "NotificationTemplates",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-4111-8111-111111111104"),
                column: "TenantId",
                value: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.UpdateData(
                table: "NotificationTemplates",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-4111-8111-111111111105"),
                column: "TenantId",
                value: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.CreateIndex(
                name: "IX_SystemSettings_TenantId",
                table: "SystemSettings",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_NotificationTemplates_TenantId",
                table: "NotificationTemplates",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_Notifications_TenantId",
                table: "Notifications",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_AuditLogs_TenantId",
                table: "AuditLogs",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_SystemSettings_TenantId",
                table: "SystemSettings");

            migrationBuilder.DropIndex(
                name: "IX_NotificationTemplates_TenantId",
                table: "NotificationTemplates");

            migrationBuilder.DropIndex(
                name: "IX_Notifications_TenantId",
                table: "Notifications");

            migrationBuilder.DropIndex(
                name: "IX_AuditLogs_TenantId",
                table: "AuditLogs");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "SystemSettings");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "NotificationTemplates");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "Notifications");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "NotificationPreferences");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "AuditLogs");
        }
    }
}
