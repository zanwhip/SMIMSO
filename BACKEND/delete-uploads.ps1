# ========================================
# DELETE ALL UPLOADED FILES
# ========================================
# ⚠️ WARNING: This will delete ALL uploaded files!
# ⚠️ This action CANNOT be undone!
# ========================================

Write-Host "========================================" -ForegroundColor Yellow
Write-Host "⚠️  DELETE ALL UPLOADED FILES" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Yellow
Write-Host ""

# Get uploads directory
$uploadsDir = Join-Path $PSScriptRoot "uploads"

# Check if uploads directory exists
if (-Not (Test-Path $uploadsDir)) {
    Write-Host "✅ Uploads directory does not exist. Nothing to delete." -ForegroundColor Green
    exit 0
}

# Count files before deletion
$fileCount = (Get-ChildItem -Path $uploadsDir -Recurse -File).Count
Write-Host "📁 Found $fileCount files in uploads directory" -ForegroundColor Cyan
Write-Host ""

# Confirm deletion
Write-Host "⚠️  This will delete ALL $fileCount files!" -ForegroundColor Red
$confirmation = Read-Host "Type 'DELETE' to confirm"

if ($confirmation -ne "DELETE") {
    Write-Host "❌ Deletion cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🗑️  Deleting files..." -ForegroundColor Yellow

try {
    # Delete all files in uploads directory
    Get-ChildItem -Path $uploadsDir -Recurse -File | Remove-Item -Force
    
    # Delete all subdirectories
    Get-ChildItem -Path $uploadsDir -Recurse -Directory | Remove-Item -Force -Recurse
    
    Write-Host "✅ All files deleted successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Summary:" -ForegroundColor Cyan
    Write-Host "   - Deleted: $fileCount files" -ForegroundColor Green
    Write-Host "   - Uploads directory: Cleaned" -ForegroundColor Green
}
catch {
    Write-Host "❌ Error deleting files: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ DELETION COMPLETE" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

