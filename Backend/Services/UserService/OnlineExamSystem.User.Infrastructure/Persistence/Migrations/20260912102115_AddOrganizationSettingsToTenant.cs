using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOrganizationSettingsToTenant : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccentColor",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DateFormat",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultAcademicYear",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DefaultLanguage",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "EnableMultiCampus",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "EstablishedYear",
                table: "Tenants",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FaviconContentType",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "FaviconData",
                table: "Tenants",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IncludeAddressInPdfFooter",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoContentType",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "LogoData",
                table: "Tenants",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "MottoTagline",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "PrimaryColor",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SecondaryColor",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ShortName",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowLogoOnPdfReports",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<bool>(
                name: "ShowMottoTagline",
                table: "Tenants",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatoryDesignation",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatoryName",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SignatureImageContentType",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "SignatureImageData",
                table: "Tenants",
                type: "varbinary(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TextColor",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TimeZone",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "Tenants",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("11111111-1111-1111-1111-111111111111"),
                columns: new[] { "AccentColor", "ContactEmail", "ContactPhone", "DateFormat", "DefaultAcademicYear", "DefaultLanguage", "EnableMultiCampus", "EstablishedYear", "FaviconContentType", "FaviconData", "IncludeAddressInPdfFooter", "LogoContentType", "LogoData", "MottoTagline", "PrimaryColor", "SecondaryColor", "ShortName", "ShowLogoOnPdfReports", "ShowMottoTagline", "SignatoryDesignation", "SignatoryName", "SignatureImageContentType", "SignatureImageData", "TextColor", "TimeZone", "Website" },
                values: new object[] { null, null, null, null, null, null, false, null, null, null, true, null, null, null, null, null, null, true, true, null, null, null, null, null, null, null });

            migrationBuilder.UpdateData(
                table: "Tenants",
                keyColumn: "Id",
                keyValue: new Guid("22222222-2222-2222-2222-222222222222"),
                columns: new[] { "AccentColor", "ContactEmail", "ContactPhone", "DateFormat", "DefaultAcademicYear", "DefaultLanguage", "EnableMultiCampus", "EstablishedYear", "FaviconContentType", "FaviconData", "IncludeAddressInPdfFooter", "LogoContentType", "LogoData", "MottoTagline", "PrimaryColor", "SecondaryColor", "ShortName", "ShowLogoOnPdfReports", "ShowMottoTagline", "SignatoryDesignation", "SignatoryName", "SignatureImageContentType", "SignatureImageData", "TextColor", "TimeZone", "Website" },
                values: new object[] { null, null, null, null, null, null, false, null, null, null, true, null, null, null, null, null, null, true, true, null, null, null, null, null, null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccentColor",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "DateFormat",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "DefaultAcademicYear",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "DefaultLanguage",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "EnableMultiCampus",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "EstablishedYear",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "FaviconContentType",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "FaviconData",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "IncludeAddressInPdfFooter",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "LogoContentType",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "LogoData",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "MottoTagline",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "PrimaryColor",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "SecondaryColor",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ShortName",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ShowLogoOnPdfReports",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "ShowMottoTagline",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "SignatoryDesignation",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "SignatoryName",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "SignatureImageContentType",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "SignatureImageData",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "TextColor",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "TimeZone",
                table: "Tenants");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "Tenants");
        }
    }
}
