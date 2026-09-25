using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRequireEmailVerification : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "RequireEmailVerification",
                table: "PlatformSettings",
                type: "bit",
                nullable: false,
                // Hand-edited from the scaffolded false: the existing settings row must
                // keep verification on (the behaviour before this was a setting).
                defaultValue: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RequireEmailVerification",
                table: "PlatformSettings");
        }
    }
}
