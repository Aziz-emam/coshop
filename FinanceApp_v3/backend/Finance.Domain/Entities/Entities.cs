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

/// <summary>OperationDate = business date; CreatedAt = system registration time</summary>
public class IncomeEntry : BaseEntity {
  public DateTime OperationDate { get; set; }
  public IncomeSource Source { get; set; }
  public decimal Amount { get; set; }
  public string? Notes { get; set; }
  public int CreatedByUserId { get; set; }
  public string CreatedByName { get; set; } = "";
}

public class ExpenseEntry : BaseEntity {
  public DateTime OperationDate { get; set; }
  public int ExpenseCategoryId { get; set; }
  public ExpenseCategory ExpenseCategory { get; set; } = null!;
  public decimal Amount { get; set; }
  public string? Notes { get; set; }
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
  public string EntityType { get; set; } = ""; // Income | Expense
  public int EntityId { get; set; }
  public string Action { get; set; } = ""; // Edit | Delete
  public string Summary { get; set; } = "";
  public string? Note { get; set; }
}
