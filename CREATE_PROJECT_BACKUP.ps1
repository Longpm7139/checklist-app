# Project Backup Script
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$projectName = "ChecklistApp_Backup"
$backupFileName = "$projectName`_$timestamp.zip"
$sourceDir = "c:\Users\thais\OneDrive\Desktop\Checklist\checklist-app"
$artifactDir = "C:\Users\thais\.gemini\antigravity\brain\b66da12b-2997-459a-8415-6e13699488ff"
$destinationDir = "c:\Users\thais\OneDrive\Desktop\Checklist\_Backups"

# Ensure backup directory exists
if (-not (Test-Path $destinationDir)) {
    New-Item -Path $destinationDir -ItemType Directory
}

# Create a temporary staging area
$stagingDir = New-Item -Path "$env:TEMP\BackupStaging_$timestamp" -ItemType Directory

Write-Host "Staging files for backup..." -ForegroundColor Cyan

# Copy Project Files (Excluding node_modules, .next, etc.)
$excludePatterns = @("node_modules", ".next", ".git", "dist", "tmp", ".gemini")
Get-ChildItem -Path $sourceDir -Recurse | Where-Object { 
    $path = $_.FullName
    $skip = $false
    foreach ($pattern in $excludePatterns) {
        if ($path -like "*\$pattern*") { $skip = $true; break }
    }
    -not $skip
} | Copy-Item -Destination {
    $relPath = $_.FullName.Substring($sourceDir.Length + 1)
    $dest = Join-Path $stagingDir.FullName $relPath
    if ($_.PSIsContainer) { New-Item -Path $dest -ItemType Directory -Force }
    $dest
} -ErrorAction SilentlyContinue

# Copy Brain Artifacts
Write-Host "Adding documentation artifacts..." -ForegroundColor Cyan
$artifactBackupDir = New-Item -Path (Join-Path $stagingDir.FullName "_Brain_Archive") -ItemType Directory
Copy-Item -Path "$artifactDir\*" -Destination $artifactBackupDir.FullName -Recurse

# Compress the staging area
Write-Host "Creating ZIP archive: $backupFileName..." -ForegroundColor Yellow
Compress-Archive -Path "$($stagingDir.FullName)\*" -DestinationPath (Join-Path $destinationDir $backupFileName) -Force

# Cleanup
Remove-Item -Path $stagingDir -Recurse -Force

Write-Host "Backup completed successfully!" -ForegroundColor Green
Write-Host "Location: $(Join-Path $destinationDir $backupFileName)" -ForegroundColor Green
