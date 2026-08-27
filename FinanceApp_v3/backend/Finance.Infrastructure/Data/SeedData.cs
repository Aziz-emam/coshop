using Finance.Domain.Entities;
using Finance.Domain.Enums;
using Microsoft.EntityFrameworkCore;
namespace Finance.Infrastructure.Data;
public static class SeedData {
  public static async Task EnsureSeededAsync(AppDbContext db) {
    await db.Database.EnsureCreatedAsync();
    if (!await db.Users.AnyAsync()) {
      db.Users.AddRange(
        new AppUser { Username = "owner", DisplayName = "المالك", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@123"), Role = UserRole.Owner },
        new AppUser { Username = "finance", DisplayName = "المالي", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Finance@123"), Role = UserRole.Finance }
      );
    }
    if (!await db.SystemSettings.AnyAsync()) {
      db.SystemSettings.Add(new SystemSettings { Id = 1, BusinessName = "المالية", PartnersPageTitle = "الشركاء", IconTheme = "classic" });
    }
    if (!await db.ExpenseCategories.AnyAsync()) {
      db.ExpenseCategories.AddRange(
        new ExpenseCategory { Name = "رواتب", Code = "SALARY", IsSystem = true, SortOrder = 1 },
        new ExpenseCategory { Name = "إيجار", Code = "RENT", IsSystem = true, SortOrder = 2 },
        new ExpenseCategory { Name = "كهرباء", Code = "ELEC", IsSystem = true, SortOrder = 3 },
        new ExpenseCategory { Name = "مياه", Code = "WATER", IsSystem = true, SortOrder = 4 },
        new ExpenseCategory { Name = "مشتريات/موارد", Code = "SUPPLY", IsSystem = true, SortOrder = 5 },
        new ExpenseCategory { Name = "صيانة", Code = "MAINT", IsSystem = true, SortOrder = 6 },
        new ExpenseCategory { Name = "توزيع أرباح", Code = "PROFIT_DIST", IsSystem = true, SortOrder = 7 },
        new ExpenseCategory { Name = "أخرى", Code = "OTHER", IsSystem = true, SortOrder = 99 }
      );
    }
    await db.SaveChangesAsync();
  }
}
