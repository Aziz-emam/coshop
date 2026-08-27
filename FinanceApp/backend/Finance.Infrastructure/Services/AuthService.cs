using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Finance.Application.DTOs;
using Finance.Infrastructure.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Finance.Infrastructure.Services;
public class AuthService {
  private readonly AppDbContext _db; private readonly IConfiguration _cfg;
  public AuthService(AppDbContext db, IConfiguration cfg) { _db = db; _cfg = cfg; }
  public async Task<LoginResultDto> LoginAsync(LoginDto dto) {
    var u = await _db.Users.FirstOrDefaultAsync(x => x.Username == dto.Username.Trim() && !x.IsDeleted && x.IsActive)
      ?? throw new InvalidOperationException("بيانات الدخول غير صحيحة");
    if (!BCrypt.Net.BCrypt.Verify(dto.Password, u.PasswordHash)) throw new InvalidOperationException("بيانات الدخول غير صحيحة");
    var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_cfg["Jwt:Key"] ?? "FinanceAppSecretKey_ChangeMe_32chars_Min!!"));
    var token = new JwtSecurityToken(claims: new[] {
      new Claim(ClaimTypes.NameIdentifier, u.Id.ToString()),
      new Claim(ClaimTypes.Name, u.DisplayName),
      new Claim(ClaimTypes.Role, u.Role.ToString())
    }, expires: DateTime.UtcNow.AddHours(14), signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));
    return new LoginResultDto(new JwtSecurityTokenHandler().WriteToken(token), u.DisplayName, u.Role.ToString(), u.Id);
  }
}
