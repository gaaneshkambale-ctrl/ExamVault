using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCodeStatusAndTenantScopingToExamType : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "ExamTypes",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "ExamTypes",
                type: "uniqueidentifier",
                nullable: false,
                // Backfill every pre-existing row to User Service's seeded Default
                // tenant (OnlineExamSystem.Shared.Common.Multitenancy.TenantConstants),
                // same precedent as the AddTenantScoping migration - ExamType had
                // been left out of that pass and was a real cross-tenant leak
                // (every tenant saw and shared the same global rows) until now.
                // Any OTHER real tenant starts with zero exam types after this
                // migration and adds its own from here on, matching normal
                // multi-tenant behavior for tenant-owned catalog data.
                defaultValue: new Guid("11111111-1111-1111-1111-111111111111"));

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "ExamTypes",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            // Backfill a real, unique-per-prefix code for every pre-existing row
            // before the unique index below is created - see
            // ExamTypeCodeGenerator for the equivalent used for new rows going
            // forward.
            migrationBuilder.Sql(@"
;WITH Prefixed AS (
    SELECT
        Id,
        CASE
            WHEN LEN(LEFT(UPPER(REPLACE(REPLACE(REPLACE(Name, ' ', ''), '-', ''), '_', '')), 3)) = 0 THEN 'GEN'
            ELSE LEFT(UPPER(REPLACE(REPLACE(REPLACE(Name, ' ', ''), '-', ''), '_', '')), 3)
        END AS Prefix
    FROM ExamTypes
),
Numbered AS (
    SELECT
        Id,
        Prefix,
        ROW_NUMBER() OVER (PARTITION BY Prefix ORDER BY Id) AS Seq
    FROM Prefixed
)
UPDATE t
SET t.Code = n.Prefix + '-' + RIGHT('0' + CAST(n.Seq AS VARCHAR(2)), 2)
FROM ExamTypes t
JOIN Numbered n ON n.Id = t.Id;
");

            migrationBuilder.AlterColumn<string>(
                name: "Code",
                table: "ExamTypes",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20,
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_ExamTypes_TenantId",
                table: "ExamTypes",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_ExamTypes_TenantId_Code",
                table: "ExamTypes",
                columns: new[] { "TenantId", "Code" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_ExamTypes_TenantId",
                table: "ExamTypes");

            migrationBuilder.DropIndex(
                name: "IX_ExamTypes_TenantId_Code",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "ExamTypes");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "ExamTypes");
        }
    }
}
