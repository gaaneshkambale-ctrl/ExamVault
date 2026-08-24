using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPlansAndFeatureGating : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "PlanId",
                table: "Tenants",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateTable(
                name: "Plans",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    IncludedFeatures = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Plans", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "Plans",
                columns: new[] { "Id", "CreatedAtUtc", "Description", "IncludedFeatures", "Name", "UpdatedAtUtc" },
                values: new object[] { new Guid("33333333-3333-3333-3333-333333333333"), new DateTime(2026, 8, 23, 0, 0, 0, 0, DateTimeKind.Utc), "Every Admin console module included - the default for every organization until Super Admin assigns a different plan.", "Users,Exams,ExamTypes,LiveMonitoring,Results,Reports,Notifications,Settings", "Full Access", new DateTime(2026, 8, 23, 0, 0, 0, 0, DateTimeKind.Utc) });

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                column: "PlanId",
                value: new Guid("33333333-3333-3333-3333-333333333333"));

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                column: "PlanId",
                value: new Guid("33333333-3333-3333-3333-333333333333"));

            // The two UpdateData calls above only cover the two seeded rows
            // (HasData only ever describes seed data, not runtime rows) -
            // every Tenant created since (Create Organization, or any other
            // org already provisioned before this migration) still has the
            // AddColumn defaultValue placeholder (Guid.Empty), which matches
            // no real Plan and would violate the FK constraint added below.
            // Backfilling every remaining Guid.Empty row to Full Access
            // keeps this migration additive - no existing org loses access.
            migrationBuilder.Sql(
                "UPDATE [Tenants] SET [PlanId] = '33333333-3333-3333-3333-333333333333' " +
                "WHERE [PlanId] = '00000000-0000-0000-0000-000000000000';");

            migrationBuilder.CreateIndex(
                name: "IX_Tenants_PlanId",
                table: "Tenants",
                column: "PlanId");

            migrationBuilder.AddForeignKey(
                name: "FK_Tenants_Plans_PlanId",
                table: "Tenants",
                column: "PlanId",
                principalTable: "Plans",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Tenants_Plans_PlanId",
                table: "Tenants");

            migrationBuilder.DropTable(
                name: "Plans");

            migrationBuilder.DropIndex(
                name: "IX_Tenants_PlanId",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "PlanId",
                table: "Tenants");
        }
    }
}
