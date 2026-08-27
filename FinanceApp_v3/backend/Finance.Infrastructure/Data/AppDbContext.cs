using Finance.Domain.Entities;
using Microsoft.EntityFrameworkCore;
namespace Finance.Infrastructure.Data;
public class AppDbContext : DbContext {
  public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }
  public DbSet<AppUser> Users => Set<AppUser>();
  public DbSet<SystemSettings> SystemSettings => Set<SystemSettings>();
  public DbSet<ExpenseCategory> ExpenseCategories => Set<ExpenseCategory>();
  public DbSet<Partner> Partners => Set<Partner>();
  public DbSet<Employee> Employees => Set<Employee>();
  public DbSet<IncomeEntry> IncomeEntries => Set<IncomeEntry>();
  public DbSet<ExpenseEntry> ExpenseEntries => Set<ExpenseEntry>();
  public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
}
