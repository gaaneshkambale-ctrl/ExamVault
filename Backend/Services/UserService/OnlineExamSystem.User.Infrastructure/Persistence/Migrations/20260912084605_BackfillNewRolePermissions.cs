using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace OnlineExamSystem.User.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class BackfillNewRolePermissions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Assignments-Manage/Live Monitoring-View/Security Violations-View/
            // Notifications-Create were added to RolePermissionCatalog's
            // Admin/Instructor defaults across this same initiative, but
            // DefaultsForRole is only a one-time seed written the first time a
            // tenant ever touches Roles & Permissions (see catalog's own
            // comment) - any tenant that had already been seeded before these
            // four existed never picks them up. Confirmed live on a real
            // tenant: Admin/Instructor both 403'd on Assignments/Live
            // Monitoring/Notifications despite the code granting them by
            // default, because the persisted row set predated the four keys.
            //
            // Backfilling is safe specifically because these four are
            // brand new - no tenant could have ever explicitly unchecked a
            // permission that didn't exist in the UI yet, so there's no risk
            // of undoing an intentional removal (unlike a blanket "re-sync
            // everything to current defaults", which would).
            migrationBuilder.Sql(@"
                INSERT INTO RolePermissions (Id, TenantId, Role, PermissionKey, CreatedAtUtc, UpdatedAtUtc)
                SELECT NEWID(), seeded.TenantId, seeded.Role, missing.PermissionKey, SYSUTCDATETIME(), SYSUTCDATETIME()
                FROM (SELECT DISTINCT TenantId, Role FROM RolePermissions WHERE Role IN ('Admin', 'Instructor')) AS seeded
                CROSS JOIN (VALUES
                    ('Assignments - Manage'),
                    ('Live Monitoring - View'),
                    ('Security Violations - View'),
                    ('Notifications - Create')
                ) AS missing(PermissionKey)
                WHERE NOT EXISTS (
                    SELECT 1 FROM RolePermissions rp
                    WHERE rp.TenantId = seeded.TenantId
                      AND rp.Role = seeded.Role
                      AND rp.PermissionKey = missing.PermissionKey
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Best-effort reversal, matching SplitLiveMonitoringFeature's own
            // precedent - removes these four keys from every Admin/Instructor
            // row rather than tracking exactly which rows this migration
            // added. Acceptable since none of the four could have existed
            // before this migration ran on a real database.
            migrationBuilder.Sql(@"
                DELETE FROM RolePermissions
                WHERE Role IN ('Admin', 'Instructor')
                  AND PermissionKey IN (
                    'Assignments - Manage',
                    'Live Monitoring - View',
                    'Security Violations - View',
                    'Notifications - Create'
                  );
            ");
        }
    }
}
