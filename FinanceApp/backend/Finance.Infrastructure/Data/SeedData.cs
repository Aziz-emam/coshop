using Finance.Domain.Entities;
using Finance.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
namespace Finance.Infrastructure.Data;
public static class SeedData {
  public static async Task InitAsync(IServiceProvider sp) {
    using var scope = sp.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.EnsureCreatedAsync();
    if (await db.Users.AnyAsync()) return;

    db.Users.Add(new AppUser { Username = "owner", DisplayName = "المالك", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Owner@123"), Role = UserRole.Owner, IsActive = true });
    db.Users.Add(new AppUser { Username = "finance", DisplayName = "المالي", PasswordHash = BCrypt.Net.BCrypt.HashPassword("Finance@123"), Role = UserRole.Finance, IsActive = true });
    db.SystemSettings.Add(new SystemSettings { Id = 1, BusinessName = "المالية", PartnersPageTitle = "الشركاء", IconTheme = "classic", FirstDayOpeningBalance = 0 });
    db.ExpenseCategories.AddRange(
      new ExpenseCategory { Name = "رواتب", Code = "SALARY", IsSystem = true, SortOrder = 1 },
      new ExpenseCategory { Name = "توزيع أرباح", Code = "PROFIT_DIST", IsSystem = true, SortOrder = 2 },
      new ExpenseCategory { Name = "إيجار", Code = "RENT", SortOrder = 3 },
      new ExpenseCategory { Name = "كهرباء", Code = "ELEC", SortOrder = 4 },
      new ExpenseCategory { Name = "مياه", Code = "WATER", SortOrder = 5 },
      new ExpenseCategory { Name = "مشتريات", Code = "PURCHASE", SortOrder = 6 },
      new ExpenseCategory { Name = "صيانة", Code = "MAINT", SortOrder = 7 },
      new ExpenseCategory { Name = "أخرى", Code = "OTHER", SortOrder = 8 }
    );
    await db.SaveChangesAsync();
  }
}
