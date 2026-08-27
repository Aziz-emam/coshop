using System.Security.Claims;
using Finance.Application.DTOs;
using Finance.Infrastructure.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Finance.Api.Controllers;

[ApiController][Route("api/[controller]")]
public class AuthController : ControllerBase {
  private readonly AuthService _s; public AuthController(AuthService s) => _s = s;
  [HttpPost("login")] public async Task<IActionResult> Login([FromBody] LoginDto dto) {
    try { return Ok(await _s.LoginAsync(dto)); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
}

[ApiController][Route("api/[controller]")][Authorize]
public class FinanceController : ControllerBase {
  private readonly FinanceService _s;
  public FinanceController(FinanceService s) => _s = s;
  int Uid => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
  string Uname => User.FindFirstValue(ClaimTypes.Name) ?? "";
  string Role => User.FindFirstValue(ClaimTypes.Role) ?? "Finance";

  [HttpGet("settings")] public async Task<IActionResult> Settings() => Ok(await _s.GetSettings());
  [HttpPut("settings")][Authorize(Roles = "Owner")]
  public async Task<IActionResult> UpSettings([FromBody] UpdateSettingsDto dto) {
    await _s.UpdateSettings(dto); return Ok(await _s.GetSettings());
  }

  [HttpGet("users")][Authorize(Roles = "Owner")] public async Task<IActionResult> Users() => Ok(await _s.Users());
  [HttpPost("users")][Authorize(Roles = "Owner")] public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto) {
    try { await _s.CreateUser(dto); return Ok(); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPost("users/{id}/toggle")][Authorize(Roles = "Owner")] public async Task<IActionResult> ToggleUser(int id) {
    try { await _s.ToggleUser(id); return Ok(); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpDelete("users/{id}")][Authorize(Roles = "Owner")] public async Task<IActionResult> DeleteUser(int id) {
    try { await _s.DeleteUser(id); return Ok(); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }

  [HttpGet("categories")] public async Task<IActionResult> Cats() => Ok(await _s.Categories());
  [HttpPost("categories")][Authorize(Roles = "Owner")] public async Task<IActionResult> AddCat([FromBody] CreateCategoryDto dto) => Ok(await _s.AddCategory(dto));

  [HttpGet("partners")] public async Task<IActionResult> Partners() {
    var list = await _s.Partners();
    var info = await _s.PartnersPercentInfo();
    return Ok(new { partners = list, totalPercent = info.total, remainingPercent = info.remaining, warning = info.warn });
  }
  [HttpPost("partners")][Authorize(Roles = "Owner")] public async Task<IActionResult> AddPartner([FromBody] CreatePartnerDto dto) {
    try { return Ok(await _s.AddPartner(dto)); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPut("partners/{id}")][Authorize(Roles = "Owner")] public async Task<IActionResult> UpPartner(int id, [FromBody] UpdatePartnerDto dto) {
    try { await _s.UpdatePartner(id, dto); return Ok(); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpDelete("partners/{id}")][Authorize(Roles = "Owner")] public async Task<IActionResult> DelPartner(int id) {
    try { await _s.DeletePartner(id); return Ok(); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpGet("partners/{id}/expenses")] public async Task<IActionResult> PartnerExp(int id) => Ok(await _s.PartnerExpenses(id));
  [HttpPost("partners/calculate")] public async Task<IActionResult> CalcPartners([FromQuery] DateTime from, [FromQuery] DateTime to)
    => Ok(await _s.CalculatePartners(from, to));

  [HttpGet("employees")] public async Task<IActionResult> Emps() => Ok(await _s.Employees());
  [HttpPost("employees")] public async Task<IActionResult> AddEmp([FromBody] CreateEmployeeDto dto) {
    try { return Ok(await _s.AddEmployee(dto)); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPut("employees/{id}")] public async Task<IActionResult> UpEmp(int id, [FromBody] UpdateEmployeeDto dto) {
    try { await _s.UpdateEmployee(id, dto); return Ok(); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpDelete("employees/{id}")][Authorize(Roles = "Owner")] public async Task<IActionResult> DelEmp(int id) {
    try { await _s.DeleteEmployee(id); return Ok(); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }

  [HttpGet("days/current")] public async Task<IActionResult> Current() => Ok(await _s.CurrentDay());
  [HttpGet("days")] public async Task<IActionResult> Days([FromQuery] DateTime? from, [FromQuery] DateTime? to) => Ok(await _s.ListDays(from, to));
  [HttpGet("days/{id:int}")] public async Task<IActionResult> Day(int id) {
    try { return Ok(await _s.DayDetail(id)); } catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPost("days/open")] public async Task<IActionResult> Open([FromQuery] DateTime? date) {
    try { return Ok(await _s.OpenDay(date, Uid, Uname)); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPost("days/{id:int}/close")] public async Task<IActionResult> Close(int id) {
    try { await _s.CloseDay(id, Uid, Uname); return Ok(); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPost("days/{id:int}/reopen")][Authorize(Roles = "Owner")] public async Task<IActionResult> Reopen(int id) {
    try { await _s.ReopenDay(id, Uid, Uname); return Ok(await _s.DayDetail(id)); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPost("days/{id:int}/incomes")] public async Task<IActionResult> AddInc(int id, [FromBody] AddIncomeDto dto) {
    try { await _s.AddIncome(id, dto, Uid, Uname, Role); return Ok(); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpPost("days/{id:int}/expenses")] public async Task<IActionResult> AddExp(int id, [FromBody] AddExpenseDto dto) {
    try { await _s.AddExpense(id, dto, Uid, Uname, Role); return Ok(); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpDelete("incomes/{id:int}")] public async Task<IActionResult> DelInc(int id) {
    try { await _s.SoftDeleteIncome(id, Uid, Uname, Role); return Ok(); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }
  [HttpDelete("expenses/{id:int}")] public async Task<IActionResult> DelExp(int id) {
    try { await _s.SoftDeleteExpense(id, Uid, Uname, Role); return Ok(); }
    catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
  }

  [HttpGet("reports/period")] public async Task<IActionResult> Period([FromQuery] DateTime from, [FromQuery] DateTime to) => Ok(await _s.PeriodReport(from, to));
  [HttpGet("reports/salary")] public async Task<IActionResult> Salary([FromQuery] DateTime from, [FromQuery] DateTime to) => Ok(await _s.SalaryReport(from, to));
}

[ApiController][Route("api/[controller]")][Authorize(Roles = "Owner")]
public class UploadsController : ControllerBase {
  private readonly IWebHostEnvironment _env;
  private readonly FinanceService _s;
  public UploadsController(IWebHostEnvironment env, FinanceService s) { _env = env; _s = s; }

  [HttpPost("{type}")]
  public async Task<IActionResult> Upload(string type, IFormFile file) {
    if (file == null || file.Length == 0) return BadRequest(new { message = "لا يوجد ملف" });
    if (type is not ("logo" or "loginBg" or "homeBg")) return BadRequest(new { message = "نوع غير صالح" });
    var dir = Path.Combine(_env.ContentRootPath, "wwwroot", "uploads");
    Directory.CreateDirectory(dir);
    var name = $"{type}_{DateTime.UtcNow:yyyyMMddHHmmss}{Path.GetExtension(file.FileName)}";
    await using (var fs = System.IO.File.Create(Path.Combine(dir, name))) await file.CopyToAsync(fs);
    var rel = $"/uploads/{name}";
    await _s.SetMedia(type, rel);
    return Ok(new { path = rel });
  }

  [HttpDelete("media/{type}")]
  public async Task<IActionResult> Clear(string type) {
    if (type is not ("logo" or "loginBg" or "homeBg")) return BadRequest(new { message = "نوع غير صالح" });
    await _s.SetMedia(type, null);
    return Ok();
  }
}
