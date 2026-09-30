using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPdfReportSettingsToTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AlternatePhone",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EnableWatermark",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "RegistrationNumber",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowContactDetails",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowPageNumbers",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowQrCodeForVerification",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "TaxIdentificationNumber",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "UseBrandColorsInReportHeader",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "AlternatePhone", "EnableWatermark", "RegistrationNumber", "ShowContactDetails", "ShowPageNumbers", "ShowQrCodeForVerification", "TaxIdentificationNumber", "UseBrandColorsInReportHeader" },
                values: new object[] { null, false, null, true, true, true, null, true });

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "AlternatePhone", "EnableWatermark", "RegistrationNumber", "ShowContactDetails", "ShowPageNumbers", "ShowQrCodeForVerification", "TaxIdentificationNumber", "UseBrandColorsInReportHeader" },
                values: new object[] { null, false, null, true, true, true, null, true });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AlternatePhone",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "EnableWatermark",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "RegistrationNumber",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ShowContactDetails",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ShowPageNumbers",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ShowQrCodeForVerification",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "TaxIdentificationNumber",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "UseBrandColorsInReportHeader",
                table: "Tenants");
        }
    }
}
