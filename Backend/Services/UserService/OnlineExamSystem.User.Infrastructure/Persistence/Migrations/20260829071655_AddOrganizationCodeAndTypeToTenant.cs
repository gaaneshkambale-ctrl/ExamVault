using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationCodeAndTypeToTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "OrganizationCode",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OrganizationType",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "OrganizationCode", "OrganizationType" },
                values: new object[] { null, null });

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "OrganizationCode", "OrganizationType" },
                values: new object[] { null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "OrganizationCode",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "OrganizationType",
                table: "Tenants");
        }
    }
}
