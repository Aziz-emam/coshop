namespace Finance.Application.DTOs;

public record LoginDto(string Username, string Password);
public record LoginResultDto(string Token, string DisplayName, string Role, int UserId);

public record SettingsDto(string BusinessName, string PartnersPageTitle, string? LogoPath, string? LoginBackgroundPath, string? HomeBackgroundPath, string IconTheme, decimal FirstDayOpeningBalance);
public record UpdateSettingsDto(string BusinessName, string PartnersPageTitle, string IconTheme, decimal FirstDayOpeningBalance);

public record UserDto(int Id, string Username, string DisplayName, string Role, bool IsActive);
public record CreateUserDto(string Username, string DisplayName, string Password, string Role);

public record CategoryDto(int Id, string Name, string Code, bool IsSystem, bool IsActive, int SortOrder);
public record CreateCategoryDto(string Name, string Code);

public record PartnerDto(int Id, string Name, string Code, decimal SharePercent, bool IsActive, string? Notes, decimal PaidTotal, decimal EntitledHint, decimal RemainingHint);
public record CreatePartnerDto(string Name, string Code, decimal SharePercent, string? Notes);
public record UpdatePartnerDto(string Name, string Code, decimal SharePercent, bool IsActive, string? Notes);

public record EmployeeDto(int Id, string Name, string? JobTitle, decimal BaseSalary, DateTime? HireDate, bool IsActive, string? Notes);
public record CreateEmployeeDto(string Name, string? JobTitle, decimal BaseSalary, DateTime? HireDate, string? Notes);
public record UpdateEmployeeDto(string Name, string? JobTitle, decimal BaseSalary, DateTime? HireDate, bool IsActive, string? Notes);

public record WorkDayDto(int Id, DateTime Date, decimal OpeningBalance, string Status, decimal TotalIncome, decimal TotalExpense, decimal Net);
public record IncomeDto(int Id, string Source, decimal Amount, string? Notes, string? AttachmentPath, string CreatedByName, DateTime CreatedAt);
public record ExpenseDto(int Id, int CategoryId, string CategoryName, string CategoryCode, decimal Amount, string? Notes, int? PartnerId, string? PartnerName, int? EmployeeId, string? EmployeeName, string CreatedByName, DateTime CreatedAt);

public record AddIncomeDto(IncomeSourceVal Source, decimal Amount, string? Notes);
public record AddExpenseDto(int CategoryId, decimal Amount, string? Notes, int? PartnerId, int? EmployeeId);
public enum IncomeSourceVal { KidsArea = 1, CoffeeShop = 2, Other = 3 }

public record DayDetailDto(WorkDayDto Day, List<IncomeDto> Incomes, List<ExpenseDto> Expenses, List<AuditDto> Audits);
public record AuditDto(DateTime CreatedAt, string UserName, string Action, string Summary);

public record PartnerCalcDto(int PartnerId, string Name, decimal SharePercent, decimal Entitled, decimal Paid, decimal Remaining);
public record PartnerCalcResultDto(DateTime From, DateTime To, decimal BaseNet, List<PartnerCalcDto> Partners, decimal TotalPercent, decimal RemainingPercent, bool PercentWarning);

public record PeriodReportDto(DateTime From, DateTime To, decimal OpeningFirst, decimal TotalIncome, decimal TotalExpense, decimal LastNet, int DaysCount, List<SourceSumDto> BySource, List<CatSumDto> ByCategory);
public record SourceSumDto(string Source, decimal Amount);
public record CatSumDto(string Category, decimal Amount);
public record SalaryReportDto(DateTime From, DateTime To, List<EmpSumDto> Employees, decimal Total);
public record EmpSumDto(string Name, decimal Total, int Count);
