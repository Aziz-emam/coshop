using System.Text;
using Finance.Infrastructure.Data;
using Finance.Infrastructure.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(builder.Configuration.GetConnectionString("Default") ?? "Data Source=finance.db"));
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<FinanceService>();
var key = builder.Configuration["Jwt:Key"] ?? "FinanceAppSecretKey_ChangeMe_32chars_Min!!";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer(o => {
  o.TokenValidationParameters = new TokenValidationParameters {
    ValidateIssuer = false, ValidateAudience = false, ValidateLifetime = true,
    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key))
  };
});
builder.Services.AddAuthorization();
builder.Services.AddControllers();
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p.AllowAnyHeader().AllowAnyMethod().AllowAnyOrigin()));
var app = builder.Build();
await SeedData.InitAsync(app.Services);
Directory.CreateDirectory(Path.Combine(app.Environment.ContentRootPath, "wwwroot", "uploads"));
app.UseCors();
app.UseStaticFiles();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.Run();
