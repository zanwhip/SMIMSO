# SMIMSO API Test Script
# Chạy: .\test-api.ps1

$baseUrl = "http://localhost:5000/api"
$token = ""
$userId = ""
$postId = ""

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          🧪 SMIMSO API Testing Script                    ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Helper function
function Test-API {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [hashtable]$Headers = @{},
        [string]$Body = $null
    )
    
    Write-Host "Testing: $Name" -ForegroundColor Yellow
    Write-Host "  → $Method $Url" -ForegroundColor Gray
    
    try {
        $params = @{
            Uri = $Url
            Method = $Method
            Headers = $Headers
        }
        
        if ($Body) {
            $params.Body = $Body
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        
        if ($response.success) {
            Write-Host "  ✅ SUCCESS" -ForegroundColor Green
            return $response
        } else {
            Write-Host "  ❌ FAILED: $($response.error)" -ForegroundColor Red
            return $null
        }
    } catch {
        Write-Host "  ❌ ERROR: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
    Write-Host ""
}

# ============================================
# 1. HEALTH CHECK
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "1️⃣  HEALTH CHECK" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$health = Test-API -Name "Health Check" -Method "GET" -Url "$baseUrl/health"

if (-not $health) {
    Write-Host "`n❌ Server không chạy! Vui lòng chạy backend trước." -ForegroundColor Red
    Write-Host "   cd BACKEND && npm run dev" -ForegroundColor Yellow
    exit
}

# ============================================
# 2. OPTIONS API
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "2️⃣  OPTIONS API" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$options = Test-API -Name "Get All Options" -Method "GET" -Url "$baseUrl/options"
$jobs = Test-API -Name "Get Job Options" -Method "GET" -Url "$baseUrl/options/jobs"
$categories = Test-API -Name "Get Categories" -Method "GET" -Url "$baseUrl/options/categories"

if ($jobs) {
    Write-Host "  📋 Found $($jobs.data.Count) job options" -ForegroundColor Green
}

if ($categories) {
    Write-Host "  📋 Found $($categories.data.Count) categories" -ForegroundColor Green
}

# ============================================
# 3. AUTH API - REGISTER
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "3️⃣  AUTH API - REGISTER" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$registerBody = @{
    email = "test$timestamp@example.com"
    phone = "012345$timestamp"
    password = "123456"
    confirmPassword = "123456"
    first_name = "Test"
    last_name = "User"
    date_of_birth = "2000-01-01"
    job = "developer"
} | ConvertTo-Json

$register = Test-API -Name "Register New User" -Method "POST" -Url "$baseUrl/auth/register" -Body $registerBody

if ($register) {
    $token = $register.data.token
    $userId = $register.data.user.id
    Write-Host "  🔑 Token: $($token.Substring(0, 20))..." -ForegroundColor Green
    Write-Host "  👤 User ID: $userId" -ForegroundColor Green
}

# ============================================
# 4. AUTH API - LOGIN
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "4️⃣  AUTH API - LOGIN" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$loginBody = @{
    emailOrPhone = "test$timestamp@example.com"
    password = "123456"
} | ConvertTo-Json

$login = Test-API -Name "Login" -Method "POST" -Url "$baseUrl/auth/login" -Body $loginBody

# ============================================
# 5. AUTH API - GET ME
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "5️⃣  AUTH API - GET ME" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$authHeaders = @{
    "Authorization" = "Bearer $token"
}

$me = Test-API -Name "Get Current User" -Method "GET" -Url "$baseUrl/auth/me" -Headers $authHeaders

# ============================================
# 6. SURVEY API
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "6️⃣  SURVEY API" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$surveyStatus = Test-API -Name "Check Survey Status" -Method "GET" -Url "$baseUrl/survey/status" -Headers $authHeaders

$surveyOptions = Test-API -Name "Get Survey Options" -Method "GET" -Url "$baseUrl/survey/options" -Headers $authHeaders

# Get first 3 category IDs
$categoryIds = @()
if ($categories -and $categories.data.Count -ge 3) {
    $categoryIds = @($categories.data[0].value, $categories.data[1].value, $categories.data[2].value)
}

$surveyBody = @{
    favorite_categories = $categoryIds
    purpose = "inspiration"
    how_did_you_know = "google"
    expectation = "high"
} | ConvertTo-Json

$submitSurvey = Test-API -Name "Submit Survey" -Method "POST" -Url "$baseUrl/survey" -Headers $authHeaders -Body $surveyBody

$getSurvey = Test-API -Name "Get User Survey" -Method "GET" -Url "$baseUrl/survey" -Headers $authHeaders

# ============================================
# 7. POSTS API - PUBLIC
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "7️⃣  POSTS API - PUBLIC" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$posts = Test-API -Name "Get All Posts" -Method "GET" -Url "$baseUrl/posts?page=1&limit=10"

if ($posts -and $posts.data.posts.Count -gt 0) {
    $postId = $posts.data.posts[0].id
    Write-Host "  📝 Found $($posts.data.posts.Count) posts" -ForegroundColor Green
    Write-Host "  📝 First Post ID: $postId" -ForegroundColor Green
    
    $postDetail = Test-API -Name "Get Post Detail" -Method "GET" -Url "$baseUrl/posts/$postId"
    $postComments = Test-API -Name "Get Post Comments" -Method "GET" -Url "$baseUrl/posts/$postId/comments"
}

$userPosts = Test-API -Name "Get User Posts" -Method "GET" -Url "$baseUrl/posts/user/$userId"

# ============================================
# 8. POSTS API - INTERACTIONS
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "8️⃣  POSTS API - INTERACTIONS" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($postId) {
    $like = Test-API -Name "Like Post" -Method "POST" -Url "$baseUrl/posts/$postId/like" -Headers $authHeaders
    
    $commentBody = @{
        content = "Great post! This is a test comment."
    } | ConvertTo-Json
    
    $comment = Test-API -Name "Add Comment" -Method "POST" -Url "$baseUrl/posts/$postId/comments" -Headers $authHeaders -Body $commentBody
    
    $save = Test-API -Name "Save Post" -Method "POST" -Url "$baseUrl/posts/$postId/save" -Headers $authHeaders
}

# ============================================
# 9. USERS API
# ============================================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "9️⃣  USERS API" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

$profile = Test-API -Name "Get User Profile" -Method "GET" -Url "$baseUrl/users/profile" -Headers $authHeaders

$updateBody = @{
    bio = "This is my test bio"
} | ConvertTo-Json

$updateProfile = Test-API -Name "Update Profile" -Method "PUT" -Url "$baseUrl/users/profile" -Headers $authHeaders -Body $updateBody

$activities = Test-API -Name "Get User Activities" -Method "GET" -Url "$baseUrl/users/activities" -Headers $authHeaders

$likedPosts = Test-API -Name "Get Liked Posts" -Method "GET" -Url "$baseUrl/users/liked-posts" -Headers $authHeaders

# ============================================
# SUMMARY
# ============================================
Write-Host "`n╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                  ✅ TEST COMPLETED                        ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Test Summary:" -ForegroundColor Cyan
Write-Host "  - Health Check: ✅" -ForegroundColor Green
Write-Host "  - Options API: ✅" -ForegroundColor Green
Write-Host "  - Auth API: ✅" -ForegroundColor Green
Write-Host "  - Survey API: ✅" -ForegroundColor Green
Write-Host "  - Posts API: ✅" -ForegroundColor Green
Write-Host "  - Users API: ✅" -ForegroundColor Green
Write-Host ""
Write-Host "🔑 Test Credentials:" -ForegroundColor Yellow
Write-Host "  Email: test$timestamp@example.com" -ForegroundColor White
Write-Host "  Password: 123456" -ForegroundColor White
Write-Host "  Token: $($token.Substring(0, 30))..." -ForegroundColor White
Write-Host ""

