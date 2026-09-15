using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "OrganizationTypes",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedByUserId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    UpdatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrganizationTypes", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "OrganizationTypes",
                columns: new[] { "Id", "CreatedAtUtc", "CreatedByUserId", "IsActive", "Name", "SortOrder", "UpdatedAtUtc", "UpdatedByUserId" },
                values: new object[,]
                {
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000001"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "College", 0, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000002"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "University", 1, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000003"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "School", 2, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000004"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Coaching Institute", 3, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000005"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Training Institute", 4, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000006"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Corporate / L&D", 5, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000007"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Certification Institute", 6, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null },
                    { new Guid("9c1a1e10-0001-4a00-8000-000000000008"), new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null, true, "Recruitment / Hiring", 7, new DateTime(2026, 9, 13, 0, 0, 0, 0, DateTimeKind.Utc), null }
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrganizationTypes_Name",
                table: "OrganizationTypes",
                column: "Name",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrganizationTypes");
        }
    }
}
