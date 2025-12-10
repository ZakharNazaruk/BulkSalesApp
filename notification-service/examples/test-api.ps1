# PowerShell скрипты для тестирования Notification Service API

$baseUrl = "http://localhost:8081"

Write-Host "=== Notification Service API Tests ===" -ForegroundColor Green
Write-Host ""

# Test 1: Health Check
Write-Host "1. Testing Health Check..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/api/notifications/health" -Method Get
    Write-Host "✓ Health Check: $healthResponse" -ForegroundColor Green
} catch {
    Write-Host "✗ Health Check failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 2: PRODUCT_LOW_STOCK Event
Write-Host "2. Testing PRODUCT_LOW_STOCK Event..." -ForegroundColor Yellow
$productLowStockEvent = @{
    productId = 123
    productName = "Ноутбук Dell XPS 15"
    currentQuantity = 5
    threshold = 10
    managerId = 1
} | ConvertTo-Json

try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/api/notifications/events/product-low-stock" `
        -Method Post `
        -Body $productLowStockEvent `
        -ContentType "application/json"
    
    Write-Host "✓ PRODUCT_LOW_STOCK notification created:" -ForegroundColor Green
    Write-Host "  ID: $($response1.id)" -ForegroundColor Cyan
    Write-Host "  Title: $($response1.title)" -ForegroundColor Cyan
    Write-Host "  Status: $($response1.status)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ PRODUCT_LOW_STOCK failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 3: ORDER_STATUS_CHANGED Event
Write-Host "3. Testing ORDER_STATUS_CHANGED Event..." -ForegroundColor Yellow
$orderStatusEvent = @{
    orderId = 456
    userId = 2
    oldStatus = "PROCESSING"
    newStatus = "SHIPPED"
} | ConvertTo-Json

try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/api/notifications/events/order-status-changed" `
        -Method Post `
        -Body $orderStatusEvent `
        -ContentType "application/json"
    
    Write-Host "✓ ORDER_STATUS_CHANGED notification created:" -ForegroundColor Green
    Write-Host "  ID: $($response2.id)" -ForegroundColor Cyan
    Write-Host "  Title: $($response2.title)" -ForegroundColor Cyan
    Write-Host "  Status: $($response2.status)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ ORDER_STATUS_CHANGED failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 4: Get All Notifications
Write-Host "4. Testing Get All Notifications..." -ForegroundColor Yellow
try {
    $allNotifications = Invoke-RestMethod -Uri "$baseUrl/api/notifications" -Method Get
    Write-Host "✓ Retrieved $($allNotifications.Count) notifications" -ForegroundColor Green
    
    if ($allNotifications.Count -gt 0) {
        Write-Host "  Latest notification:" -ForegroundColor Cyan
        $latest = $allNotifications[-1]
        Write-Host "    ID: $($latest.id)" -ForegroundColor Cyan
        Write-Host "    Title: $($latest.title)" -ForegroundColor Cyan
        Write-Host "    Created: $($latest.createdAt)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "✗ Get All Notifications failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 5: Get Notification by User ID
Write-Host "5. Testing Get Notifications by User ID..." -ForegroundColor Yellow
try {
    $userNotifications = Invoke-RestMethod -Uri "$baseUrl/api/notifications/user/1" -Method Get
    Write-Host "✓ Retrieved $($userNotifications.Count) notifications for user 1" -ForegroundColor Green
} catch {
    Write-Host "✗ Get User Notifications failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

# Test 6: Broadcast Notification (Manager only)
Write-Host "6. Testing Broadcast Notification..." -ForegroundColor Yellow
$broadcastRequest = @{
    title = "Новая акция в BulkSales!"
    message = "Уважаемые клиенты! Специальное предложение - скидки до 50% на все товары до конца месяца!"
    target = "ALL_USERS"
} | ConvertTo-Json

try {
    $headers = @{
        "X-User-Role" = "MANAGER"
    }
    
    $broadcastResponse = Invoke-RestMethod -Uri "$baseUrl/api/notifications/broadcast" `
        -Method Post `
        -Body $broadcastRequest `
        -ContentType "application/json" `
        -Headers $headers
    
    Write-Host "✓ Broadcast completed:" -ForegroundColor Green
    Write-Host "  Total Users: $($broadcastResponse.totalUsers)" -ForegroundColor Cyan
    Write-Host "  Success: $($broadcastResponse.successCount)" -ForegroundColor Cyan
    Write-Host "  Failed: $($broadcastResponse.failureCount)" -ForegroundColor Cyan
} catch {
    Write-Host "✗ Broadcast failed: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Tests Completed ===" -ForegroundColor Green
