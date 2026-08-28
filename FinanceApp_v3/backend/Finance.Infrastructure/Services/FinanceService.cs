using Finance.Application.DTOs;
using Finance.Domain.Entities;
using Finance.Domain.Enums;
using Finance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Finance.Infrastructure.Services;

public class FinanceService {
  private readonly AppDbContext _db;
  public FinanceService(AppDbContext db) => _db = db;

  static DateTime TodayLocal() {
    try {
      return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById("Africa/Cairo")).Date;
    } catch { return DateTime.UtcNow.AddHours(3).Date; }
  }

  async Task Audit(int userId, string userName, string entityType, int entityId, string action, string summary, string? note) {
    _db.AuditLogs.Add(new AuditLog {
      UserId = userId, UserName = userName, EntityType = entityType, EntityId = entityId,
      Action = action, Summary = summary, Note = note
    });
    await _db.SaveChangesAsync();
  }

  // ---- Settings / Users ----
  public async Task<SettingsDto> GetSettings() {
    var s = await _db.SystemSettings.FirstAsync(x => x.Id == 1);
    return new SettingsDto(s.BusinessName, s.PartnersPageTitle, s.LogoPath, s.LoginBackgroundPath, s.HomeBackgroundPath, s.IconTheme);
  }
  public async Task UpdateSettings(UpdateSettingsDto dto) {
    var s = await _db.SystemSettings.FirstAsync(x => x.Id == 1);
    s.BusinessName = dto.BusinessName.Trim();
    s.PartnersPageTitle = string.IsNullOrWhiteSpace(dto.PartnersPageTitle) ? "الشركاء" : dto.PartnersPageTitle.Trim();
    s.IconTheme = dto.IconTheme; s.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }
  public async Task SetMedia(string type, string? path) {
    var s = await _db.SystemSettings.FirstAsync(x => x.Id == 1);
    if (type == "logo") s.LogoPath = path;
    else if (type == "loginBg") s.LoginBackgroundPath = path;
    else if (type == "homeBg") s.HomeBackgroundPath = path;
    s.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }

  public async Task<List<UserDto>> Users() =>
    await _db.Users.Where(u => !u.IsDeleted).Select(u => new UserDto(u.Id, u.Username, u.DisplayName, u.Role.ToString(), u.IsActive)).ToListAsync();

  public async Task CreateUser(CreateUserDto dto) {
    if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
      throw new InvalidOperationException("اسم المستخدم وكلمة المرور مطلوبان");
    if (await _db.Users.AnyAsync(u => u.Username == dto.Username.Trim() && !u.IsDeleted))
      throw new InvalidOperationException("اسم المستخدم مستخدم");
    var role = dto.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase) ? UserRole.Owner : UserRole.Finance;
    _db.Users.Add(new AppUser {
      Username = dto.Username.Trim(), DisplayName = dto.DisplayName.Trim(),
      PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password), Role = role
    });
    await _db.SaveChangesAsync();
  }
  public async Task ToggleUser(int id) {
    var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    if (u.Username == "owner") throw new InvalidOperationException("لا يمكن تعطيل المالك الأساسي");
    u.IsActive = !u.IsActive; u.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }
  public async Task DeleteUser(int id) {
    var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    if (u.Username == "owner") throw new InvalidOperationException("لا يمكن حذف المالك الأساسي");
    u.IsDeleted = true; u.IsActive = false; u.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }

  // ---- Categories ----
  public async Task<List<CategoryDto>> Categories() =>
    await _db.ExpenseCategories.Where(c => !c.IsDeleted && c.IsActive).OrderBy(c => c.SortOrder)
      .Select(c => new CategoryDto(c.Id, c.Name, c.Code, c.IsSystem)).ToListAsync();
  public async Task<CategoryDto> AddCategory(CreateCategoryDto dto) {
    var e = new ExpenseCategory { Name = dto.Name.Trim(), Code = dto.Code.Trim().ToUpperInvariant(), SortOrder = 100 };
    _db.ExpenseCategories.Add(e); await _db.SaveChangesAsync();
    return new CategoryDto(e.Id, e.Name, e.Code, e.IsSystem);
  }

  // ---- Partners ----
  async Task<int?> ProfitCatId() =>
    (await _db.ExpenseCategories.FirstOrDefaultAsync(x => x.Code == "PROFIT_DIST" && !x.IsDeleted))?.Id;

   public async Task<List<PartnerDto>> Partners()
  {
      var list = await _db.Partners.Where(p => !p.IsDeleted).OrderBy(p => p.Name).ToListAsync();
      var catId = await ProfitCatId();
      var allInc = (await _db.IncomeEntries.Where(x => !x.IsDeleted).Select(x => x.Amount).ToListAsync()).Sum();
      var allExp = (await _db.ExpenseEntries.Where(x => !x.IsDeleted).Select(x => x.Amount).ToListAsync()).Sum();
      var baseNet = allInc - allExp;
      var result = new List<PartnerDto>();
      foreach (var p in list)
      {
          decimal paid = 0;
          if (catId.HasValue)
          {
              var paidList = await _db.ExpenseEntries
                  .Where(e => !e.IsDeleted && e.PartnerId == p.Id && e.ExpenseCategoryId == catId)
                  .Select(e => e.Amount).ToListAsync();
              paid = paidList.Sum();
          }
          var entitled = Math.Round(baseNet * p.SharePercent / 100m, 2);
          result.Add(new PartnerDto(p.Id, p.Name, p.Code, p.SharePercent, p.IsActive, p.Notes, paid, entitled, entitled - paid));
      }
      return result;
  }

  public async Task<(decimal total, decimal remaining, bool warn)> PartnersPercentInfo()
  {
      var percents = await _db.Partners.Where(p => !p.IsDeleted && p.IsActive)
          .Select(p => p.SharePercent).ToListAsync();
      var total = percents.Sum();
      return (total, 100 - total, Math.Abs(total - 100) > 0.01m);
  }
  public async Task<PartnerDto> AddPartner(CreatePartnerDto dto) {
    if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Code))
      throw new InvalidOperationException("الاسم والكود مطلوبان");
    var code = dto.Code.Trim().ToUpperInvariant();
    if (await _db.Partners.AnyAsync(p => p.Code == code && !p.IsDeleted))
      throw new InvalidOperationException("كود الشريك مستخدم مسبقاً");
    var e = new Partner { Name = dto.Name.Trim(), Code = code, SharePercent = dto.SharePercent, Notes = dto.Notes, IsActive = true };
    _db.Partners.Add(e);
    await _db.SaveChangesAsync();
    return new PartnerDto(e.Id, e.Name, e.Code, e.SharePercent, e.IsActive, e.Notes, 0, 0, 0);
  }
  public async Task UpdatePartner(int id, UpdatePartnerDto dto) {
    var e = await _db.Partners.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    e.Name = dto.Name.Trim(); e.Code = dto.Code.Trim().ToUpperInvariant();
    e.SharePercent = dto.SharePercent; e.IsActive = dto.IsActive; e.Notes = dto.Notes;
    e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }
  public async Task DeletePartner(int id) {
    var e = await _db.Partners.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    e.IsDeleted = true; e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }
    public async Task<ExpenseDto> AddPartnerDistribution(int partnerId, AddDistributionDto dto, int userId, string userName)
  {
      var p = await _db.Partners.FirstOrDefaultAsync(x => x.Id == partnerId && !x.IsDeleted)
          ?? throw new InvalidOperationException("الشريك غير موجود");
      if (dto.Amount <= 0) throw new InvalidOperationException("المبلغ يجب أن يكون أكبر من صفر");
      var cat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Code == "PROFIT_DIST" && !c.IsDeleted)
          ?? throw new InvalidOperationException("بند توزيع الأرباح غير موجود");
      var e = new ExpenseEntry {
          OperationDate = dto.OperationDate.Date,
          ExpenseCategoryId = cat.Id,
          Amount = dto.Amount,
          Notes = dto.Notes,
          PartnerId = partnerId,
          CreatedByUserId = userId,
          CreatedByName = userName
      };
      _db.ExpenseEntries.Add(e);
      await _db.SaveChangesAsync();
      await _db.Entry(e).Reference(x => x.ExpenseCategory).LoadAsync();
      await _db.Entry(e).Reference(x => x.Partner).LoadAsync();
      return MapExpenses(new List<ExpenseEntry> { e })[0];
  }
  public async Task<List<ExpenseDto>> PartnerExpenses(int partnerId)
{
    var list = await _db.ExpenseEntries
        .Include(x => x.ExpenseCategory)
        .Include(x => x.Partner)
        .Include(x => x.Employee)
        .Where(x => !x.IsDeleted && x.PartnerId == partnerId)
        .OrderByDescending(x => x.OperationDate)
        .ThenByDescending(x => x.CreatedAt)
        .ToListAsync();
    return MapExpenses(list);
}

  // ---- Employees ----
  public async Task<List<EmployeeDto>> Employees() =>
    await _db.Employees.Where(e => !e.IsDeleted).OrderBy(e => e.Name)
      .Select(e => new EmployeeDto(e.Id, e.Name, e.JobTitle, e.BaseSalary, e.HireDate, e.IsActive, e.Notes)).ToListAsync();
  public async Task<EmployeeDto> AddEmployee(CreateEmployeeDto dto) {
    if (string.IsNullOrWhiteSpace(dto.Name)) throw new InvalidOperationException("اسم الموظف مطلوب");
    var e = new Employee { Name = dto.Name.Trim(), JobTitle = dto.JobTitle, BaseSalary = dto.BaseSalary, HireDate = dto.HireDate, Notes = dto.Notes };
    _db.Employees.Add(e); await _db.SaveChangesAsync();
    return new EmployeeDto(e.Id, e.Name, e.JobTitle, e.BaseSalary, e.HireDate, e.IsActive, e.Notes);
  }
  public async Task UpdateEmployee(int id, UpdateEmployeeDto dto) {
    var e = await _db.Employees.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    e.Name = dto.Name.Trim(); e.JobTitle = dto.JobTitle; e.BaseSalary = dto.BaseSalary;
    e.HireDate = dto.HireDate; e.IsActive = dto.IsActive; e.Notes = dto.Notes; e.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }
  
  public async Task DeleteEmployee(int id) {
    var e = await _db.Employees.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    e.IsDeleted = true; e.IsActive = false; e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }
  public async Task<List<SalaryPaymentDto>> EmployeeSalaries(int employeeId)
  {
      var salaryCat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Code == "SALARY" && !c.IsDeleted);
      if (salaryCat == null) return new List<SalaryPaymentDto>();
      return await _db.ExpenseEntries
          .Where(x => !x.IsDeleted && x.ExpenseCategoryId == salaryCat.Id && x.EmployeeId == employeeId)
          .OrderByDescending(x => x.OperationDate).ThenByDescending(x => x.CreatedAt)
          .Select(x => new SalaryPaymentDto(x.Id, x.OperationDate, x.Amount, x.Notes, x.CreatedAt, x.CreatedByName))
          .ToListAsync();
  }
  // ---- Dashboard ----
  public async Task<DashboardDto> Dashboard() {
    var incomes = await _db.IncomeEntries.Where(x => !x.IsDeleted).ToListAsync();
    var expenses = await _db.ExpenseEntries.Where(x => !x.IsDeleted).ToListAsync();
    var ti = incomes.Sum(x => x.Amount);
    var te = expenses.Sum(x => x.Amount);
    DateTime? last = null; string? lastType = null;
    var lastInc = incomes.OrderByDescending(x => x.CreatedAt).FirstOrDefault();
    var lastExp = expenses.OrderByDescending(x => x.CreatedAt).FirstOrDefault();
    if (lastInc != null && (lastExp == null || lastInc.CreatedAt >= lastExp.CreatedAt)) {
      last = lastInc.CreatedAt; lastType = "وارد";
    } else if (lastExp != null) {
      last = lastExp.CreatedAt; lastType = "مصروف";
    }
    return new DashboardDto(ti, te, ti - te, last, lastType, incomes.Count, expenses.Count);
  }

  /// <summary>
  /// Day net = incomes(date) - expenses(date).
  /// CumulativeBefore = sum all ops with OperationDate &lt; date.
  /// CumulativeAfter = CumulativeBefore + DayNet.
  /// </summary>
  public async Task<DayNetDto> DayNet(DateTime date) {
    date = date.Date;
    var incDay = await _db.IncomeEntries.Where(x => !x.IsDeleted && x.OperationDate.Date == date).SumAsync(x => x.Amount);
    var expDay = await _db.ExpenseEntries.Where(x => !x.IsDeleted && x.OperationDate.Date == date).SumAsync(x => x.Amount);
    var incBefore = await _db.IncomeEntries.Where(x => !x.IsDeleted && x.OperationDate.Date < date).SumAsync(x => x.Amount);
    var expBefore = await _db.ExpenseEntries.Where(x => !x.IsDeleted && x.OperationDate.Date < date).SumAsync(x => x.Amount);
    var before = incBefore - expBefore;
    var dayNet = incDay - expDay;
    return new DayNetDto(date, incDay, expDay, dayNet, before, before + dayNet);
  }

  // ---- Incomes ----
public async Task<PagedResultDto<IncomeDto>> ListIncomes(DateTime? from, DateTime? to, int page = 1, int pageSize = 25)
  {
      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 25;
      var q = _db.IncomeEntries.Where(x => !x.IsDeleted);
      if (from.HasValue) q = q.Where(x => x.OperationDate.Date >= from.Value.Date);
      if (to.HasValue) q = q.Where(x => x.OperationDate.Date <= to.Value.Date);
      var total = await q.CountAsync();
      var list = await q.OrderByDescending(x => x.OperationDate).ThenByDescending(x => x.CreatedAt)
          .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
      var items = list.Select(x => new IncomeDto(x.Id, x.OperationDate, x.CreatedAt, x.Source.ToString(), x.Amount, x.Notes, x.CreatedByName)).ToList();
      var pages = total == 0 ? 1 : (int)Math.Ceiling(total / (double)pageSize);
      return new PagedResultDto<IncomeDto>(items, page, pageSize, total, pages);
  }
  public async Task<IncomeDto> AddIncome(AddIncomeDto dto, int userId, string userName) {
    if (dto.Amount <= 0) throw new InvalidOperationException("المبلغ يجب أن يكون أكبر من صفر");
    if (dto.Source is < 1 or > 3) throw new InvalidOperationException("مصدر غير صالح");
    var e = new IncomeEntry {
      OperationDate = dto.OperationDate.Date,
      Source = (IncomeSource)dto.Source,
      Amount = dto.Amount,
      Notes = dto.Notes,
      CreatedByUserId = userId,
      CreatedByName = userName
    };
    _db.IncomeEntries.Add(e); await _db.SaveChangesAsync();
    return new IncomeDto(e.Id, e.OperationDate, e.CreatedAt, e.Source.ToString(), e.Amount, e.Notes, e.CreatedByName);
  }
  public async Task EditIncome(int id, EditIncomeDto dto, int userId, string userName) {
    if (string.IsNullOrWhiteSpace(dto.EditNote)) throw new InvalidOperationException("ملاحظة التعديل مطلوبة");
    var e = await _db.IncomeEntries.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    var old = $"{e.OperationDate:yyyy-MM-dd} / {e.Source} / {e.Amount}";
    e.OperationDate = dto.OperationDate.Date;
    e.Source = (IncomeSource)dto.Source;
    e.Amount = dto.Amount;
    e.Notes = dto.Notes;
    e.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
    await Audit(userId, userName, "Income", id, "Edit", $"من [{old}] إلى [{e.OperationDate:yyyy-MM-dd} / {e.Source} / {e.Amount}]", dto.EditNote);
  }
  public async Task DeleteIncome(int id, DeleteNoteDto dto, int userId, string userName) {
    if (string.IsNullOrWhiteSpace(dto.EditNote)) throw new InvalidOperationException("ملاحظة الحذف مطلوبة");
    var e = await _db.IncomeEntries.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    e.IsDeleted = true; e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
    await Audit(userId, userName, "Income", id, "Delete", $"حذف وارد {e.Amount} بتاريخ {e.OperationDate:yyyy-MM-dd}", dto.EditNote);
  }

  // ---- Expenses ----
  List<ExpenseDto> MapExpenses(List<ExpenseEntry> list) => list.Select(x => new ExpenseDto(
    x.Id, x.OperationDate, x.CreatedAt, x.ExpenseCategoryId, x.ExpenseCategory.Name, x.ExpenseCategory.Code,
    x.Amount, x.Notes, x.PartnerId, x.Partner?.Name, x.EmployeeId, x.Employee?.Name, x.CreatedByName)).ToList();

  public async Task<PagedResultDto<ExpenseDto>> ListExpenses(DateTime? from, DateTime? to, int page = 1, int pageSize = 25)
  {
      if (page < 1) page = 1;
      if (pageSize < 1 || pageSize > 100) pageSize = 25;
      var q = _db.ExpenseEntries.Include(x => x.ExpenseCategory).Include(x => x.Partner).Include(x => x.Employee)
          .Where(x => !x.IsDeleted);
      if (from.HasValue) q = q.Where(x => x.OperationDate.Date >= from.Value.Date);
      if (to.HasValue) q = q.Where(x => x.OperationDate.Date <= to.Value.Date);
      var total = await q.CountAsync();
      var list = await q.OrderByDescending(x => x.OperationDate).ThenByDescending(x => x.CreatedAt)
          .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync();
      var pages = total == 0 ? 1 : (int)Math.Ceiling(total / (double)pageSize);
      return new PagedResultDto<ExpenseDto>(MapExpenses(list), page, pageSize, total, pages);
  }
  public async Task<ExpenseDto> AddExpense(AddExpenseDto dto, int userId, string userName) {
    if (dto.Amount <= 0) throw new InvalidOperationException("المبلغ يجب أن يكون أكبر من صفر");
    var cat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == dto.CategoryId && !c.IsDeleted)
      ?? throw new InvalidOperationException("بند المصروف غير موجود");
    if (cat.Code == "PROFIT_DIST" && dto.PartnerId == null) throw new InvalidOperationException("توزيع الأرباح يتطلب اختيار شريك");
    if (cat.Code == "SALARY" && dto.EmployeeId == null) throw new InvalidOperationException("الرواتب تتطلب اختيار موظف");
    var e = new ExpenseEntry {
      OperationDate = dto.OperationDate.Date, ExpenseCategoryId = dto.CategoryId, Amount = dto.Amount, Notes = dto.Notes,
      PartnerId = dto.PartnerId, EmployeeId = dto.EmployeeId, CreatedByUserId = userId, CreatedByName = userName
    };
    _db.ExpenseEntries.Add(e); await _db.SaveChangesAsync();
    await _db.Entry(e).Reference(x => x.ExpenseCategory).LoadAsync();
    if (e.PartnerId.HasValue) await _db.Entry(e).Reference(x => x.Partner).LoadAsync();
    if (e.EmployeeId.HasValue) await _db.Entry(e).Reference(x => x.Employee).LoadAsync();
    return MapExpenses(new List<ExpenseEntry> { e })[0];
  }
  public async Task EditExpense(int id, EditExpenseDto dto, int userId, string userName) {
    if (string.IsNullOrWhiteSpace(dto.EditNote)) throw new InvalidOperationException("ملاحظة التعديل مطلوبة");
    var e = await _db.ExpenseEntries.Include(x => x.ExpenseCategory).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("غير موجود");
    var old = $"{e.OperationDate:yyyy-MM-dd} / {e.ExpenseCategory.Name} / {e.Amount}";
    var cat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == dto.CategoryId && !c.IsDeleted)
      ?? throw new InvalidOperationException("بند غير موجود");
    if (cat.Code == "PROFIT_DIST" && dto.PartnerId == null) throw new InvalidOperationException("توزيع الأرباح يتطلب شريك");
    if (cat.Code == "SALARY" && dto.EmployeeId == null) throw new InvalidOperationException("الرواتب تتطلب موظف");
    e.OperationDate = dto.OperationDate.Date; e.ExpenseCategoryId = dto.CategoryId; e.Amount = dto.Amount;
    e.Notes = dto.Notes; e.PartnerId = dto.PartnerId; e.EmployeeId = dto.EmployeeId; e.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
    await Audit(userId, userName, "Expense", id, "Edit", $"من [{old}] إلى [{e.OperationDate:yyyy-MM-dd} / {cat.Name} / {e.Amount}]", dto.EditNote);
  }
  public async Task DeleteExpense(int id, DeleteNoteDto dto, int userId, string userName) {
    if (string.IsNullOrWhiteSpace(dto.EditNote)) throw new InvalidOperationException("ملاحظة الحذف مطلوبة");
    var e = await _db.ExpenseEntries.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted) ?? throw new InvalidOperationException("غير موجود");
    e.IsDeleted = true; e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
    await Audit(userId, userName, "Expense", id, "Delete", $"حذف مصروف {e.Amount} بتاريخ {e.OperationDate:yyyy-MM-dd}", dto.EditNote);
  }

  // ---- Partners calc / reports ----
  public async Task<PartnerCalcResultDto> CalculatePartners(DateTime from, DateTime to) {
    from = from.Date; to = to.Date;
    var ti = await _db.IncomeEntries.Where(x => !x.IsDeleted && x.OperationDate.Date >= from && x.OperationDate.Date <= to).SumAsync(x => x.Amount);
    var te = await _db.ExpenseEntries.Where(x => !x.IsDeleted && x.OperationDate.Date >= from && x.OperationDate.Date <= to).SumAsync(x => x.Amount);
    var opsNet = ti - te;
    var partners = await _db.Partners.Where(p => !p.IsDeleted && p.IsActive).ToListAsync();
    var profitCat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Code == "PROFIT_DIST" && !c.IsDeleted);
    var result = new List<PartnerCalcDto>();
    foreach (var p in partners) {
      decimal paid = 0;
      if (profitCat != null)
        paid = await _db.ExpenseEntries.Where(e => !e.IsDeleted && e.PartnerId == p.Id && e.ExpenseCategoryId == profitCat.Id
          && e.OperationDate.Date >= from && e.OperationDate.Date <= to).SumAsync(e => e.Amount);
      var entitled = Math.Round(opsNet * p.SharePercent / 100m, 2);
      result.Add(new PartnerCalcDto(p.Id, p.Name, p.SharePercent, entitled, paid, entitled - paid));
    }
    var totalPct = partners.Sum(p => p.SharePercent);
    return new PartnerCalcResultDto(from, to, opsNet, result, totalPct, 100 - totalPct, Math.Abs(totalPct - 100) > 0.01m);
  }

  public async Task<PeriodReportDto> PeriodReport(DateTime from, DateTime to) {
    from = from.Date; to = to.Date;
    var incomes = await _db.IncomeEntries.Where(x => !x.IsDeleted && x.OperationDate.Date >= from && x.OperationDate.Date <= to).ToListAsync();
    var expenses = await _db.ExpenseEntries.Include(x => x.ExpenseCategory)
      .Where(x => !x.IsDeleted && x.OperationDate.Date >= from && x.OperationDate.Date <= to).ToListAsync();
    var ti = incomes.Sum(x => x.Amount); var te = expenses.Sum(x => x.Amount);
    return new PeriodReportDto(from, to, ti, te, ti - te,
      incomes.GroupBy(x => x.Source.ToString()).Select(g => new SourceSumDto(g.Key, g.Sum(x => x.Amount))).ToList(),
      expenses.GroupBy(x => x.ExpenseCategory.Name).Select(g => new CatSumDto(g.Key, g.Sum(x => x.Amount))).ToList());
  }

  public async Task<SalaryReportDto> SalaryReport(DateTime from, DateTime to) {
    from = from.Date; to = to.Date;
    var salaryCat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Code == "SALARY");
    if (salaryCat == null) return new SalaryReportDto(from, to, new(), 0);
    var rows = await _db.ExpenseEntries.Include(x => x.Employee)
      .Where(x => !x.IsDeleted && x.ExpenseCategoryId == salaryCat.Id && x.OperationDate.Date >= from && x.OperationDate.Date <= to).ToListAsync();
    var emp = rows.Where(x => x.Employee != null).GroupBy(x => x.Employee!.Name)
      .Select(g => new EmpSumDto(g.Key, g.Sum(x => x.Amount), g.Count())).ToList();
    return new SalaryReportDto(from, to, emp, rows.Sum(x => x.Amount));
  }

  public async Task<List<AuditDto>> Audits(int take = 100) =>
    await _db.AuditLogs.OrderByDescending(x => x.CreatedAt).Take(take)
      .Select(x => new AuditDto(x.CreatedAt, x.UserName, x.EntityType, x.EntityId, x.Action, x.Summary, x.Note)).ToListAsync();
}
