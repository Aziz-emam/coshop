using Finance.Application.DTOs;
using Finance.Domain.Entities;
using Finance.Domain.Enums;
using Finance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;

namespace Finance.Infrastructure.Services;

public class FinanceService {
  private readonly AppDbContext _db;
  public FinanceService(AppDbContext db) => _db = db;

  async Task Audit(int userId, string userName, int? dayId, string action, string summary) {
    _db.AuditLogs.Add(new AuditLog { UserId = userId, UserName = userName, WorkDayId = dayId, Action = action, Summary = summary });
    await _db.SaveChangesAsync();
  }

  // Prefer Egypt-local calendar date for "today"
  static DateTime TodayLocal() {
    try {
      var tz = TimeZoneInfo.FindSystemTimeZoneById("Africa/Cairo");
      return TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, tz).Date;
    } catch {
      return DateTime.UtcNow.AddHours(3).Date;
    }
  }

  public async Task<SettingsDto> GetSettings() {
    var s = await _db.SystemSettings.FirstAsync(x => x.Id == 1);
    return new SettingsDto(s.BusinessName, s.PartnersPageTitle, s.LogoPath, s.LoginBackgroundPath, s.HomeBackgroundPath, s.IconTheme, s.FirstDayOpeningBalance);
  }

  public async Task UpdateSettings(UpdateSettingsDto dto) {
    var s = await _db.SystemSettings.FirstAsync(x => x.Id == 1);
    s.BusinessName = dto.BusinessName.Trim();
    s.PartnersPageTitle = string.IsNullOrWhiteSpace(dto.PartnersPageTitle) ? "الشركاء" : dto.PartnersPageTitle.Trim();
    s.IconTheme = dto.IconTheme;
    s.FirstDayOpeningBalance = dto.FirstDayOpeningBalance;
    s.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }

  public async Task SetMedia(string type, string? path) {
    var s = await _db.SystemSettings.FirstAsync(x => x.Id == 1);
    if (type == "logo") s.LogoPath = path;
    else if (type == "loginBg") s.LoginBackgroundPath = path;
    else if (type == "homeBg") s.HomeBackgroundPath = path;
    s.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }

  // ---- Users ----
  public async Task<List<UserDto>> Users() =>
    await _db.Users.Where(u => !u.IsDeleted)
      .Select(u => new UserDto(u.Id, u.Username, u.DisplayName, u.Role.ToString(), u.IsActive)).ToListAsync();

  public async Task CreateUser(CreateUserDto dto) {
    if (string.IsNullOrWhiteSpace(dto.Username) || string.IsNullOrWhiteSpace(dto.Password))
      throw new InvalidOperationException("اسم المستخدم وكلمة المرور مطلوبان");
    if (await _db.Users.AnyAsync(u => u.Username == dto.Username.Trim() && !u.IsDeleted))
      throw new InvalidOperationException("اسم المستخدم مستخدم");
    var role = dto.Role.Equals("Owner", StringComparison.OrdinalIgnoreCase) ? UserRole.Owner : UserRole.Finance;
    _db.Users.Add(new AppUser {
      Username = dto.Username.Trim(), DisplayName = dto.DisplayName.Trim(),
      PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password), Role = role, IsActive = true
    });
    await _db.SaveChangesAsync();
  }

  public async Task ToggleUser(int id) {
    var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("المستخدم غير موجود");
    if (u.Username == "owner") throw new InvalidOperationException("لا يمكن تعطيل المالك الأساسي");
    u.IsActive = !u.IsActive; u.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }

  public async Task DeleteUser(int id) {
    var u = await _db.Users.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("المستخدم غير موجود");
    if (u.Username == "owner") throw new InvalidOperationException("لا يمكن حذف المالك الأساسي");
    u.IsDeleted = true; u.IsActive = false; u.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }

  // ---- Categories ----
  public async Task<List<CategoryDto>> Categories() =>
    await _db.ExpenseCategories.Where(c => !c.IsDeleted && c.IsActive).OrderBy(c => c.SortOrder)
      .Select(c => new CategoryDto(c.Id, c.Name, c.Code, c.IsSystem, c.IsActive, c.SortOrder)).ToListAsync();

  public async Task<CategoryDto> AddCategory(CreateCategoryDto dto) {
    var e = new ExpenseCategory { Name = dto.Name.Trim(), Code = dto.Code.Trim().ToUpperInvariant(), SortOrder = 100 };
    _db.ExpenseCategories.Add(e); await _db.SaveChangesAsync();
    return new CategoryDto(e.Id, e.Name, e.Code, e.IsSystem, e.IsActive, e.SortOrder);
  }

  // ---- Partners ----
  async Task<int?> ProfitCatId() {
    var c = await _db.ExpenseCategories.FirstOrDefaultAsync(x => x.Code == "PROFIT_DIST" && !x.IsDeleted);
    return c?.Id;
  }

  public async Task<List<PartnerDto>> Partners() {
    var list = await _db.Partners.Where(p => !p.IsDeleted).OrderBy(p => p.Name).ToListAsync();
    var catId = await ProfitCatId();
    var result = new List<PartnerDto>();
    foreach (var p in list) {
      decimal paid = 0;
      if (catId.HasValue)
        paid = await _db.ExpenseEntries.Where(e => !e.IsDeleted && e.PartnerId == p.Id && e.ExpenseCategoryId == catId).SumAsync(e => e.Amount);
      result.Add(new PartnerDto(p.Id, p.Name, p.Code, p.SharePercent, p.IsActive, p.Notes, paid, 0, 0 - paid));
    }
    return result;
  }

  public async Task<(decimal total, decimal remaining, bool warn)> PartnersPercentInfo() {
    var total = await _db.Partners.Where(p => !p.IsDeleted && p.IsActive).SumAsync(p => p.SharePercent);
    return (total, 100 - total, Math.Abs(total - 100) > 0.01m);
  }

  public async Task<PartnerDto> AddPartner(CreatePartnerDto dto) {
    if (string.IsNullOrWhiteSpace(dto.Name) || string.IsNullOrWhiteSpace(dto.Code))
      throw new InvalidOperationException("الاسم والكود مطلوبان");
    var code = dto.Code.Trim().ToUpperInvariant();
    if (await _db.Partners.AnyAsync(p => p.Code == code && !p.IsDeleted))
      throw new InvalidOperationException("كود الشريك مستخدم");
    var e = new Partner { Name = dto.Name.Trim(), Code = code, SharePercent = dto.SharePercent, Notes = dto.Notes };
    _db.Partners.Add(e); await _db.SaveChangesAsync();
    return new PartnerDto(e.Id, e.Name, e.Code, e.SharePercent, e.IsActive, e.Notes, 0, 0, 0);
  }

  public async Task UpdatePartner(int id, UpdatePartnerDto dto) {
    var e = await _db.Partners.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
      ?? throw new InvalidOperationException("غير موجود");
    e.Name = dto.Name.Trim(); e.Code = dto.Code.Trim().ToUpperInvariant();
    e.SharePercent = dto.SharePercent; e.IsActive = dto.IsActive; e.Notes = dto.Notes;
    e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }

  public async Task DeletePartner(int id) {
    var e = await _db.Partners.FirstOrDefaultAsync(p => p.Id == id && !p.IsDeleted)
      ?? throw new InvalidOperationException("غير موجود");
    e.IsDeleted = true; e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }

  // ---- Employees ----
  public async Task<List<EmployeeDto>> Employees() =>
    await _db.Employees.Where(e => !e.IsDeleted).OrderBy(e => e.Name)
      .Select(e => new EmployeeDto(e.Id, e.Name, e.JobTitle, e.BaseSalary, e.HireDate, e.IsActive, e.Notes)).ToListAsync();

  public async Task<EmployeeDto> AddEmployee(CreateEmployeeDto dto) {
    if (string.IsNullOrWhiteSpace(dto.Name)) throw new InvalidOperationException("اسم الموظف مطلوب");
    var e = new Employee {
      Name = dto.Name.Trim(), JobTitle = dto.JobTitle, BaseSalary = dto.BaseSalary,
      HireDate = dto.HireDate, Notes = dto.Notes, IsActive = true
    };
    _db.Employees.Add(e); await _db.SaveChangesAsync();
    return new EmployeeDto(e.Id, e.Name, e.JobTitle, e.BaseSalary, e.HireDate, e.IsActive, e.Notes);
  }

  public async Task UpdateEmployee(int id, UpdateEmployeeDto dto) {
    var e = await _db.Employees.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("غير موجود");
    e.Name = dto.Name.Trim(); e.JobTitle = dto.JobTitle; e.BaseSalary = dto.BaseSalary;
    e.HireDate = dto.HireDate; e.IsActive = dto.IsActive; e.Notes = dto.Notes;
    e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
  }

  public async Task DeleteEmployee(int id) {
    var e = await _db.Employees.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("غير موجود");
    e.IsDeleted = true; e.IsActive = false; e.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
  }

  // ---- Work days ----
  async Task<WorkDayDto> ToDto(WorkDay d) {
    var ti = await _db.IncomeEntries.Where(x => x.WorkDayId == d.Id && !x.IsDeleted).SumAsync(x => x.Amount);
    var te = await _db.ExpenseEntries.Where(x => x.WorkDayId == d.Id && !x.IsDeleted).SumAsync(x => x.Amount);
    return new WorkDayDto(d.Id, d.Date, d.OpeningBalance, d.Status.ToString(), ti, te, d.OpeningBalance + ti - te);
  }

  /// <summary>Prefer open day; else latest by date.</summary>
  public async Task<WorkDayDto?> CurrentDay() {
    var open = await _db.WorkDays.Where(x => !x.IsDeleted && x.Status == DayStatus.Open)
      .OrderByDescending(x => x.Date).FirstOrDefaultAsync();
    if (open != null) return await ToDto(open);
    var last = await _db.WorkDays.Where(x => !x.IsDeleted).OrderByDescending(x => x.Date).FirstOrDefaultAsync();
    return last == null ? null : await ToDto(last);
  }

  public async Task<List<WorkDayDto>> ListDays(DateTime? from, DateTime? to) {
    var q = _db.WorkDays.Where(x => !x.IsDeleted);
    if (from.HasValue) q = q.Where(x => x.Date >= from.Value.Date);
    if (to.HasValue) q = q.Where(x => x.Date <= to.Value.Date);
    var list = await q.OrderByDescending(x => x.Date).Take(120).ToListAsync();
    var result = new List<WorkDayDto>();
    foreach (var d in list) result.Add(await ToDto(d));
    return result;
  }

  public async Task<WorkDayDto> OpenDay(DateTime? requestedDate, int userId, string userName) {
    var existingOpen = await _db.WorkDays.FirstOrDefaultAsync(x => x.Status == DayStatus.Open && !x.IsDeleted);
    if (existingOpen != null)
      throw new InvalidOperationException($"يوجد يوم مفتوح بالفعل ({existingOpen.Date:yyyy-MM-dd}). أقفلها أو استخدمه.");

    DateTime date;
    if (requestedDate.HasValue) {
      date = requestedDate.Value.Date;
    } else {
      var last = await _db.WorkDays.Where(x => !x.IsDeleted).OrderByDescending(x => x.Date).FirstOrDefaultAsync();
      if (last != null && last.Status == DayStatus.Closed)
        date = last.Date.AddDays(1); // next calendar day after last closed
      else if (last != null)
        date = last.Date;
      else
        date = TodayLocal();
    }

    if (await _db.WorkDays.AnyAsync(x => x.Date == date && !x.IsDeleted))
      throw new InvalidOperationException($"اليوم {date:yyyy-MM-dd} موجود مسبقاً. إن كان مقفلاً استخدم «إعادة فتح» (مالك) أو افتح تاريخاً لاحقاً.");

    decimal opening = 0;
    var prev = await _db.WorkDays.Where(x => x.Date < date && !x.IsDeleted).OrderByDescending(x => x.Date).FirstOrDefaultAsync();
    if (prev != null) {
      var ti = await _db.IncomeEntries.Where(x => x.WorkDayId == prev.Id && !x.IsDeleted).SumAsync(x => x.Amount);
      var te = await _db.ExpenseEntries.Where(x => x.WorkDayId == prev.Id && !x.IsDeleted).SumAsync(x => x.Amount);
      opening = prev.OpeningBalance + ti - te;
    } else {
      var s = await _db.SystemSettings.FirstAsync(x => x.Id == 1);
      opening = s.FirstDayOpeningBalance;
    }

    var day = new WorkDay { Date = date, OpeningBalance = opening, Status = DayStatus.Open, OpenedByUserId = userId };
    _db.WorkDays.Add(day); await _db.SaveChangesAsync();
    await Audit(userId, userName, day.Id, "OpenDay", $"فتح يوم {date:yyyy-MM-dd} بافتتاحي {opening}");
    return await ToDto(day);
  }

  public async Task CloseDay(int dayId, int userId, string userName) {
    var d = await _db.WorkDays.FirstOrDefaultAsync(x => x.Id == dayId && !x.IsDeleted)
      ?? throw new InvalidOperationException("اليوم غير موجود");
    if (d.Status == DayStatus.Closed) throw new InvalidOperationException("اليوم مقفل بالفعل");
    d.Status = DayStatus.Closed; d.ClosedAt = DateTime.UtcNow; d.ClosedByUserId = userId; d.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
    await Audit(userId, userName, d.Id, "CloseDay", $"إقفال يوم {d.Date:yyyy-MM-dd}");
  }

  /// <summary>Owner only — reopen closed day for continued work / testing.</summary>
  public async Task ReopenDay(int dayId, int userId, string userName) {
    var open = await _db.WorkDays.FirstOrDefaultAsync(x => x.Status == DayStatus.Open && !x.IsDeleted);
    if (open != null && open.Id != dayId)
      throw new InvalidOperationException($"يوجد يوم مفتوح ({open.Date:yyyy-MM-dd}). أقفلها أولاً.");
    var d = await _db.WorkDays.FirstOrDefaultAsync(x => x.Id == dayId && !x.IsDeleted)
      ?? throw new InvalidOperationException("اليوم غير موجود");
    if (d.Status == DayStatus.Open) throw new InvalidOperationException("اليوم مفتوح بالفعل");
    d.Status = DayStatus.Open; d.ClosedAt = null; d.ClosedByUserId = null; d.UpdatedAt = DateTime.UtcNow;
    await _db.SaveChangesAsync();
    await Audit(userId, userName, d.Id, "ReopenDay", $"إعادة فتح يوم {d.Date:yyyy-MM-dd}");
  }

  void EnsureCanEdit(WorkDay d, string role) {
    if (d.Status == DayStatus.Closed && role != "Owner")
      throw new InvalidOperationException("اليوم مقفل — التعديل للمالك فقط");
  }

  public async Task<DayDetailDto> DayDetail(int id) {
    var d = await _db.WorkDays.FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("اليوم غير موجود");
    var inc = await _db.IncomeEntries.Where(x => x.WorkDayId == id && !x.IsDeleted).OrderBy(x => x.CreatedAt).ToListAsync();
    var exp = await _db.ExpenseEntries.Include(x => x.ExpenseCategory).Include(x => x.Partner).Include(x => x.Employee)
      .Where(x => x.WorkDayId == id && !x.IsDeleted).OrderBy(x => x.CreatedAt).ToListAsync();
    var audits = await _db.AuditLogs.Where(x => x.WorkDayId == id).OrderByDescending(x => x.CreatedAt).Take(50)
      .Select(x => new AuditDto(x.CreatedAt, x.UserName, x.Action, x.Summary)).ToListAsync();
    return new DayDetailDto(await ToDto(d),
      inc.Select(x => new IncomeDto(x.Id, x.Source.ToString(), x.Amount, x.Notes, x.AttachmentPath, x.CreatedByName, x.CreatedAt)).ToList(),
      exp.Select(x => new ExpenseDto(x.Id, x.ExpenseCategoryId, x.ExpenseCategory.Name, x.ExpenseCategory.Code, x.Amount, x.Notes,
        x.PartnerId, x.Partner != null ? x.Partner.Name : null, x.EmployeeId, x.Employee != null ? x.Employee.Name : null,
        x.CreatedByName, x.CreatedAt)).ToList(),
      audits);
  }

  public async Task AddIncome(int dayId, AddIncomeDto dto, int userId, string userName, string role) {
    var d = await _db.WorkDays.FirstOrDefaultAsync(x => x.Id == dayId && !x.IsDeleted)
      ?? throw new InvalidOperationException("اليوم غير موجود");
    EnsureCanEdit(d, role);
    if (dto.Amount <= 0) throw new InvalidOperationException("المبلغ يجب أن يكون أكبر من صفر");
    _db.IncomeEntries.Add(new IncomeEntry {
      WorkDayId = dayId, Source = (IncomeSource)(int)dto.Source, Amount = dto.Amount, Notes = dto.Notes,
      CreatedByUserId = userId, CreatedByName = userName
    });
    await _db.SaveChangesAsync();
    if (d.Status == DayStatus.Closed)
      await Audit(userId, userName, dayId, "AddIncomeAfterClose", $"وارد {dto.Amount} بعد الإقفال");
  }

  public async Task AddExpense(int dayId, AddExpenseDto dto, int userId, string userName, string role) {
    var d = await _db.WorkDays.FirstOrDefaultAsync(x => x.Id == dayId && !x.IsDeleted)
      ?? throw new InvalidOperationException("اليوم غير موجود");
    EnsureCanEdit(d, role);
    if (dto.Amount <= 0) throw new InvalidOperationException("المبلغ يجب أن يكون أكبر من صفر");
    var cat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Id == dto.CategoryId && !c.IsDeleted)
      ?? throw new InvalidOperationException("بند المصروف غير موجود");
    if (cat.Code == "PROFIT_DIST" && dto.PartnerId == null)
      throw new InvalidOperationException("توزيع الأرباح يتطلب اختيار شريك");
    if (cat.Code == "SALARY" && dto.EmployeeId == null)
      throw new InvalidOperationException("الرواتب تتطلب اختيار موظف");
    _db.ExpenseEntries.Add(new ExpenseEntry {
      WorkDayId = dayId, ExpenseCategoryId = dto.CategoryId, Amount = dto.Amount, Notes = dto.Notes,
      PartnerId = dto.PartnerId, EmployeeId = dto.EmployeeId, CreatedByUserId = userId, CreatedByName = userName
    });
    await _db.SaveChangesAsync();
    if (d.Status == DayStatus.Closed)
      await Audit(userId, userName, dayId, "AddExpenseAfterClose", $"مصروف {dto.Amount} بعد الإقفال");
  }

  public async Task SoftDeleteIncome(int id, int userId, string userName, string role) {
    var e = await _db.IncomeEntries.Include(x => x.WorkDay).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("غير موجود");
    EnsureCanEdit(e.WorkDay, role);
    e.IsDeleted = true; e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
    await Audit(userId, userName, e.WorkDayId, "DeleteIncome", $"حذف وارد {e.Amount}");
  }

  public async Task SoftDeleteExpense(int id, int userId, string userName, string role) {
    var e = await _db.ExpenseEntries.Include(x => x.WorkDay).FirstOrDefaultAsync(x => x.Id == id && !x.IsDeleted)
      ?? throw new InvalidOperationException("غير موجود");
    EnsureCanEdit(e.WorkDay, role);
    e.IsDeleted = true; e.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync();
    await Audit(userId, userName, e.WorkDayId, "DeleteExpense", $"حذف مصروف {e.Amount}");
  }

  public async Task<PartnerCalcResultDto> CalculatePartners(DateTime from, DateTime to) {
    from = from.Date; to = to.Date;
    var days = await _db.WorkDays.Where(d => !d.IsDeleted && d.Date >= from && d.Date <= to).ToListAsync();
    decimal opsNet = 0;
    foreach (var d in days) {
      var ti = await _db.IncomeEntries.Where(x => x.WorkDayId == d.Id && !x.IsDeleted).SumAsync(x => x.Amount);
      var te = await _db.ExpenseEntries.Where(x => x.WorkDayId == d.Id && !x.IsDeleted).SumAsync(x => x.Amount);
      opsNet += ti - te;
    }
    var partners = await _db.Partners.Where(p => !p.IsDeleted && p.IsActive).ToListAsync();
    var profitCat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Code == "PROFIT_DIST" && !c.IsDeleted);
    var result = new List<PartnerCalcDto>();
    foreach (var p in partners) {
      decimal paid = 0;
      if (profitCat != null)
        paid = await _db.ExpenseEntries.Where(e => !e.IsDeleted && e.PartnerId == p.Id && e.ExpenseCategoryId == profitCat.Id
          && e.WorkDay.Date >= from && e.WorkDay.Date <= to).SumAsync(e => e.Amount);
      var entitled = Math.Round(opsNet * p.SharePercent / 100m, 2);
      result.Add(new PartnerCalcDto(p.Id, p.Name, p.SharePercent, entitled, paid, entitled - paid));
    }
    var totalPct = partners.Sum(p => p.SharePercent);
    return new PartnerCalcResultDto(from, to, opsNet, result, totalPct, 100 - totalPct, Math.Abs(totalPct - 100) > 0.01m);
  }

  public async Task<PeriodReportDto> PeriodReport(DateTime from, DateTime to) {
    from = from.Date; to = to.Date;
    var days = await _db.WorkDays.Where(d => !d.IsDeleted && d.Date >= from && d.Date <= to).OrderBy(d => d.Date).ToListAsync();
    if (days.Count == 0) return new PeriodReportDto(from, to, 0, 0, 0, 0, 0, new(), new());
    var first = days.First();
    var dayIds = days.Select(d => d.Id).ToList();
    var incomes = await _db.IncomeEntries.Where(x => dayIds.Contains(x.WorkDayId) && !x.IsDeleted).ToListAsync();
    var expenses = await _db.ExpenseEntries.Include(x => x.ExpenseCategory).Where(x => dayIds.Contains(x.WorkDayId) && !x.IsDeleted).ToListAsync();
    var ti = incomes.Sum(x => x.Amount); var te = expenses.Sum(x => x.Amount);
    var last = days.Last();
    var lastNet = last.OpeningBalance
      + incomes.Where(x => x.WorkDayId == last.Id).Sum(x => x.Amount)
      - expenses.Where(x => x.WorkDayId == last.Id).Sum(x => x.Amount);
    var bySource = incomes.GroupBy(x => x.Source.ToString()).Select(g => new SourceSumDto(g.Key, g.Sum(x => x.Amount))).ToList();
    var byCat = expenses.GroupBy(x => x.ExpenseCategory.Name).Select(g => new CatSumDto(g.Key, g.Sum(x => x.Amount))).ToList();
    return new PeriodReportDto(from, to, first.OpeningBalance, ti, te, lastNet, days.Count, bySource, byCat);
  }

  public async Task<SalaryReportDto> SalaryReport(DateTime from, DateTime to) {
    from = from.Date; to = to.Date;
    var salaryCat = await _db.ExpenseCategories.FirstOrDefaultAsync(c => c.Code == "SALARY");
    if (salaryCat == null) return new SalaryReportDto(from, to, new(), 0);
    var rows = await _db.ExpenseEntries.Include(x => x.Employee).Include(x => x.WorkDay)
      .Where(x => !x.IsDeleted && x.ExpenseCategoryId == salaryCat.Id && x.WorkDay.Date >= from && x.WorkDay.Date <= to).ToListAsync();
    var emp = rows.Where(x => x.Employee != null).GroupBy(x => x.Employee!.Name)
      .Select(g => new EmpSumDto(g.Key, g.Sum(x => x.Amount), g.Count())).ToList();
    return new SalaryReportDto(from, to, emp, rows.Sum(x => x.Amount));
  }

  public async Task<List<ExpenseDto>> PartnerExpenses(int partnerId) {
    return await _db.ExpenseEntries.Include(x => x.ExpenseCategory).Include(x => x.Partner).Include(x => x.Employee)
      .Where(x => !x.IsDeleted && x.PartnerId == partnerId)
      .OrderByDescending(x => x.CreatedAt)
      .Select(x => new ExpenseDto(x.Id, x.ExpenseCategoryId, x.ExpenseCategory.Name, x.ExpenseCategory.Code, x.Amount, x.Notes,
        x.PartnerId, x.Partner != null ? x.Partner.Name : null, x.EmployeeId, x.Employee != null ? x.Employee.Name : null,
        x.CreatedByName, x.CreatedAt)).ToListAsync();
  }
}
