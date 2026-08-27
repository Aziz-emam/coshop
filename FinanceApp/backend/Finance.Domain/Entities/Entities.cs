using Finance.Domain.Enums;
namespace Finance.Domain.Entities;

public class AppUser : BaseEntity {
  public string Username { get; set; } = "";
  public string DisplayName { get; set; } = "";
  public string PasswordHash { get; set; } = "";
  public UserRole Role { get; set; }
  public bool IsActive { get; set; } = true;
}

public class SystemSettings : BaseEntity {
  public string BusinessName { get; set; } = "المالية";
  public string PartnersPageTitle { get; set; } = "الشركاء";
  public string? LogoPath { get; set; }
  public string? LoginBackgroundPath { get; set; }
  public string? HomeBackgroundPath { get; set; }
  public string IconTheme { get; set; } = "classic";
  public decimal FirstDayOpeningBalance { get; set; }
}

public class ExpenseCategory : BaseEntity {
  public string Name { get; set; } = "";
  public string Code { get; set; } = "";
  public bool IsSystem { get; set; }
  public bool IsActive { get; set; } = true;
  public int SortOrder { get; set; }
}

public class Partner : BaseEntity {
  public string Name { get; set; } = "";
  public string Code { get; set; } = "";
  public decimal SharePercent { get; set; }
  public bool IsActive { get; set; } = true;
  public string? Notes { get; set; }
}

public class Employee : BaseEntity {
  public string Name { get; set; } = "";
  public string? JobTitle { get; set; }
  public decimal BaseSalary { get; set; }
  public DateTime? HireDate { get; set; }
  public bool IsActive { get; set; } = true;
  public string? Notes { get; set; }
}

public class WorkDay : BaseEntity {
  public DateTime Date { get; set; }
  public decimal OpeningBalance { get; set; }
  public DayStatus Status { get; set; } = DayStatus.Open;
  public int? OpenedByUserId { get; set; }
  public int? ClosedByUserId { get; set; }
  public DateTime? ClosedAt { get; set; }
  public ICollection<IncomeEntry> Incomes { get; set; } = new List<IncomeEntry>();
  public ICollection<ExpenseEntry> Expenses { get; set; } = new List<ExpenseEntry>();
}

public class IncomeEntry : BaseEntity {
  public int WorkDayId { get; set; }
  public WorkDay WorkDay { get; set; } = null!;
  public IncomeSource Source { get; set; }
  public decimal Amount { get; set; }
  public string? Notes { get; set; }
  public string? AttachmentPath { get; set; }
  public int CreatedByUserId { get; set; }
  public string CreatedByName { get; set; } = "";
}

public class ExpenseEntry : BaseEntity {
  public int WorkDayId { get; set; }
  public WorkDay WorkDay { get; set; } = null!;
  public int ExpenseCategoryId { get; set; }
  public ExpenseCategory ExpenseCategory { get; set; } = null!;
  public decimal Amount { get; set; }
  public string? Notes { get; set; }
  public string? AttachmentPath { get; set; }
  public int? PartnerId { get; set; }
  public Partner? Partner { get; set; }
  public int? EmployeeId { get; set; }
  public Employee? Employee { get; set; }
  public int CreatedByUserId { get; set; }
  public string CreatedByName { get; set; } = "";
}

public class AuditLog : BaseEntity {
  public int UserId { get; set; }
  public string UserName { get; set; } = "";
  public int? WorkDayId { get; set; }
  public string Action { get; set; } = "";
  public string Summary { get; set; } = "";
}
