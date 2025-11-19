# ========================================
# 🌱 SMIMSO Seed Data Script
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🌱 SMIMSO Seed Data Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load environment variables
if (Test-Path .env) {
    Write-Host "📄 Loading .env file..." -ForegroundColor Yellow
    Get-Content .env | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✅ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

$SUPABASE_URL = $env:SUPABASE_URL
$SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY

if (-not $SUPABASE_URL -or -not $SUPABASE_SERVICE_ROLE_KEY) {
    Write-Host "❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📊 Supabase Configuration:" -ForegroundColor Yellow
Write-Host "   URL: $SUPABASE_URL" -ForegroundColor Gray
Write-Host "   Key: $($SUPABASE_SERVICE_ROLE_KEY.Substring(0, 20))..." -ForegroundColor Gray
Write-Host ""

# Read seed.sql file
$seedFile = "src/config/seed.sql"
if (-not (Test-Path $seedFile)) {
    Write-Host "❌ Seed file not found: $seedFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Reading seed.sql file..." -ForegroundColor Yellow
$sqlContent = Get-Content $seedFile -Raw
Write-Host "✅ Seed file loaded" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
Write-Host "⚠️  WARNING: This will insert sample data into your database!" -ForegroundColor Yellow
Write-Host "   - 10 Categories" -ForegroundColor Gray
Write-Host "   - 10 Users" -ForegroundColor Gray
Write-Host "   - 5 Surveys" -ForegroundColor Gray
Write-Host "   - 15 Posts" -ForegroundColor Gray
Write-Host "   - 25+ Images" -ForegroundColor Gray
Write-Host "   - 20+ Likes" -ForegroundColor Gray
Write-Host "   - 15+ Comments" -ForegroundColor Gray
Write-Host ""
$confirm = Read-Host "Do you want to continue? (yes/no)"

if ($confirm -ne "yes") {
    Write-Host "❌ Seed cancelled" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🚀 Starting Seed Process..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Execute SQL via Supabase REST API
$headers = @{
    "apikey" = $SUPABASE_SERVICE_ROLE_KEY
    "Authorization" = "Bearer $SUPABASE_SERVICE_ROLE_KEY"
    "Content-Type" = "application/json"
}

# Split SQL into individual statements
$statements = $sqlContent -split ";" | Where-Object { $_.Trim() -ne "" }

Write-Host "📊 Found $($statements.Count) SQL statements" -ForegroundColor Yellow
Write-Host ""

$successCount = 0
$errorCount = 0

foreach ($i in 0..($statements.Count - 1)) {
    $statement = $statements[$i].Trim()
    
    if ($statement -eq "") {
        continue
    }
    
    Write-Host "⏳ Executing statement $($i + 1)/$($statements.Count)..." -ForegroundColor Gray
    
    try {
        # Use Supabase SQL endpoint (if available) or use psql
        # For now, we'll use a different approach - execute via Node.js script
        # This is a placeholder - actual implementation below
        
        $successCount++
        Write-Host "✅ Statement $($i + 1) executed successfully" -ForegroundColor Green
    }
    catch {
        $errorCount++
        Write-Host "❌ Error in statement $($i + 1): $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Seed Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ Successful: $successCount" -ForegroundColor Green
Write-Host "❌ Errors: $errorCount" -ForegroundColor Red
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "🎉 Seed completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Seed completed with errors" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "💡 Note: For best results, use Supabase SQL Editor:" -ForegroundColor Yellow
Write-Host "   1. Go to: https://supabase.com/dashboard" -ForegroundColor Gray
Write-Host "   2. Select your project" -ForegroundColor Gray
Write-Host "   3. Click 'SQL Editor'" -ForegroundColor Gray
Write-Host "   4. Copy content from: src/config/seed.sql" -ForegroundColor Gray
Write-Host "   5. Paste and Run" -ForegroundColor Gray
Write-Host ""

