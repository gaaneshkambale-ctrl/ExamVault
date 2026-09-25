using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionStartedAtUtcToRefreshToken : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "SessionStartedAtUtc",
                table: "RefreshTokens",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            // Hand-added: the scaffolded default (year 1) would make every
            // existing session look ancient and RefreshTokenHandler's absolute
            // session lifetime would log EVERYONE out on deploy. Start existing
            // sessions from the token's own creation time instead.
            migrationBuilder.Sql("UPDATE [RefreshTokens] SET [SessionStartedAtUtc] = [CreatedAtUtc]");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SessionStartedAtUtc",
                table: "RefreshTokens");
        }
    }
}
