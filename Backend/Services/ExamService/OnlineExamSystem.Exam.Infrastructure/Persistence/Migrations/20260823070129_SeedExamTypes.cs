using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.Exam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SeedExamTypes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            var seededAt = new DateTime(2026, 8, 23, 0, 0, 0, 0, DateTimeKind.Utc);

            migrationBuilder.InsertData(
                table: "ExamTypes",
                columns: new[] { "Id", "Name", "Purpose", "CreatedAtUtc" },
                values: new object[,]
                {
                    { new Guid("21111111-1111-4111-8111-111111111101"), "Practice Exam", "Student practice, usually unlimited/repeated attempts", seededAt },
                    { new Guid("21111111-1111-4111-8111-111111111102"), "Mock Exam", "Simulates the actual examination", seededAt },
                    { new Guid("21111111-1111-4111-8111-111111111103"), "Assessment Exam", "Regular academic/skill assessment", seededAt },
                    { new Guid("21111111-1111-4111-8111-111111111104"), "Competitive Exam", "Competitive/ranked examination", seededAt },
                    { new Guid("21111111-1111-4111-8111-111111111105"), "Certification Exam", "Used to award a certificate", seededAt },
                    { new Guid("21111111-1111-4111-8111-111111111106"), "Entrance Exam", "Admission/selection", seededAt },
                    { new Guid("21111111-1111-4111-8111-111111111107"), "Recruitment Exam", "Hiring/employee assessment", seededAt },
                    { new Guid("21111111-1111-4111-8111-111111111108"), "Internal Exam", "Organization/college internal examination", seededAt },
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "ExamTypes",
                keyColumn: "Id",
                keyValues: new object[]
                {
                    new Guid("21111111-1111-4111-8111-111111111101"),
                    new Guid("21111111-1111-4111-8111-111111111102"),
                    new Guid("21111111-1111-4111-8111-111111111103"),
                    new Guid("21111111-1111-4111-8111-111111111104"),
                    new Guid("21111111-1111-4111-8111-111111111105"),
                    new Guid("21111111-1111-4111-8111-111111111106"),
                    new Guid("21111111-1111-4111-8111-111111111107"),
                    new Guid("21111111-1111-4111-8111-111111111108"),
                });
        }
    }
}
