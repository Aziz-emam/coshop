namespace Finance.Application.DTOs;

public record LoginDto(string Username, string Password);
public record LoginResultDto(string Token, string DisplayName, string Role, int UserId);

public record SettingsDto(string BusinessName, string PartnersPageTitle, string? LogoPath, string? LoginBackgroundPath, string? HomeBackgroundPath, string IconTheme);
public record UpdateSettingsDto(string BusinessName, string PartnersPageTitle, string IconTheme);

public record UserDto(int Id, string Username, string DisplayName, string Role, bool IsActive);
public record CreateUserDto(string Username, string DisplayName, string Password, string Role);

public record CategoryDto(int Id, string Name, string Code, bool IsSystem);
public record CreateCategoryDto(string Name, string Code);

public record PartnerDto(int Id, string Name, string Code, decimal SharePercent, bool IsActive, string? Notes, decimal PaidTotal, decimal EntitledTotal, decimal RemainingTotal);
public record CreatePartnerDto(string Name, string Code, decimal SharePercent, string? Notes);
public record UpdatePartnerDto(string Name, string Code, decimal SharePercent, bool IsActive, string? Notes);

public record EmployeeDto(int Id, string Name, string? JobTitle, decimal BaseSalary, DateTime? HireDate, bool IsActive, string? Notes);
public record CreateEmployeeDto(string Name, string? JobTitle, decimal BaseSalary, DateTime? HireDate, string? Notes);
public record UpdateEmployeeDto(string Name, string? JobTitle, decimal BaseSalary, DateTime? HireDate, bool IsActive, string? Notes);

public record IncomeDto(int Id, DateTime OperationDate, DateTime CreatedAt, string Source, decimal Amount, string? Notes, string CreatedByName);
public record ExpenseDto(int Id, DateTime OperationDate, DateTime CreatedAt, int CategoryId, string CategoryName, string CategoryCode, decimal Amount, string? Notes, int? PartnerId, string? PartnerName, int? EmployeeId, string? EmployeeName, string CreatedByName);

public record AddIncomeDto(DateTime OperationDate, int Source, decimal Amount, string? Notes);
public record AddExpenseDto(DateTime OperationDate, int CategoryId, decimal Amount, string? Notes, int? PartnerId, int? EmployeeId);
public record EditIncomeDto(DateTime OperationDate, int Source, decimal Amount, string? Notes, string EditNote);
public record EditExpenseDto(DateTime OperationDate, int CategoryId, decimal Amount, string? Notes, int? PartnerId, int? EmployeeId, string EditNote);
public record DeleteNoteDto(string EditNote);

public record DashboardDto(decimal TotalIncome, decimal TotalExpense, decimal Net, DateTime? LastOperationAt, string? LastOperationType, int IncomeCount, int ExpenseCount);
public record DayNetDto(DateTime Date, decimal Income, decimal Expense, decimal DayNet, decimal CumulativeBefore, decimal CumulativeAfter);

public record PartnerCalcDto(int PartnerId, string Name, decimal SharePercent, decimal Entitled, decimal Paid, decimal Remaining);
public record PartnerCalcResultDto(DateTime From, DateTime To, decimal BaseNet, List<PartnerCalcDto> Partners, decimal TotalPercent, decimal RemainingPercent, bool PercentWarning);

public record AddDistributionDto(DateTime OperationDate, decimal Amount, string? Notes);
public record PeriodReportDto(DateTime From, DateTime To, decimal TotalIncome, decimal TotalExpense, decimal Net, List<SourceSumDto> BySource, List<CatSumDto> ByCategory);
public record SourceSumDto(string Source, decimal Amount);
public record CatSumDto(string Category, decimal Amount);
public record SalaryReportDto(DateTime From, DateTime To, List<EmpSumDto> Employees, decimal Total);
public record EmpSumDto(string Name, decimal Total, int Count);
public record AuditDto(DateTime CreatedAt, string UserName, string EntityType, int EntityId, string Action, string Summary, string? Note);
public record SalaryPaymentDto(int Id, DateTime OperationDate, decimal Amount, string? Notes, DateTime CreatedAt, string CreatedByName);
public record PagedResultDto<T>(List<T> Items, int Page, int PageSize, int TotalCount, int TotalPages);
