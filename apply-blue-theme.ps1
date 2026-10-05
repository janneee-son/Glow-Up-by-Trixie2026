# Swaps the pink theme for a white + baby blue theme across the whole project.
# Run from the project root (the folder that contains "resources").
#
#   powershell -ExecutionPolicy Bypass -File .\apply-blue-theme.ps1
#
# Commit first (git add . ; git commit -m "before blue theme") so you can undo with: git checkout .

$root = (Get-Location).Path

if (-not (Test-Path (Join-Path $root 'resources\js'))) {
    Write-Host 'Run this from the project root (the folder that contains "resources").' -ForegroundColor Red
    exit 1
}

# Order matters: the specific focus rules run first, then the general colour swaps.
$pairs = @(
    # focus rings and focus borders use the lighter blue
    @('focus-visible:border-[#E75480]', 'focus-visible:border-[#769AD0]'),
    @('ring-[#E75480]',                 'ring-[#769AD0]'),

    # main accent: buttons, icons, links
    @('#E75480', '#5F83AB'),   # primary
    @('#D63F6E', '#4E7099'),   # primary hover (darker)
    @('#B9426A', '#4A6A93'),   # accent text on light backgrounds (darker for contrast)

    # soft blues for borders and tinted backgrounds
    @('#F3A6C0', '#95B1DB'),   # borders, soft accents
    @('#F7C6D9', '#D3DFEF'),   # light borders
    @('#FCE4EC', '#E6EEF8'),   # pale tinted background
    @('#FFE4EC', '#E9F0F9'),
    @('#FFEAF2', '#EDF3FA'),

    # page and input backgrounds
    @('#FFF5F7', '#F2F5F8'),   # page background
    @('#FFFAFB', '#FAFCFE'),   # input background

    # text
    @('#4A2C33', '#1F2D40'),   # main text (deep navy)
    @('#7A5560', '#5B6B82')    # muted text (slate)
)

# Status colours (green for confirmed, red for cancelled or declined, lavender for completed) are left alone on purpose.

$utf8 = New-Object System.Text.UTF8Encoding($false)
$folders = @('resources\js', 'resources\css') | ForEach-Object { Join-Path $root $_ } | Where-Object { Test-Path $_ }
$changed = 0

Get-ChildItem -Path $folders -Recurse -File |
    Where-Object { $_.Extension -in '.tsx', '.ts', '.css' } |
    ForEach-Object {
        $original = [System.IO.File]::ReadAllText($_.FullName, [System.Text.Encoding]::UTF8)
        $text = $original

        foreach ($pair in $pairs) {
            $text = $text -ireplace [regex]::Escape($pair[0]), $pair[1]
        }

        if ($text -ne $original) {
            [System.IO.File]::WriteAllText($_.FullName, $text, $utf8)
            Write-Host "Updated $($_.FullName.Replace($root + '\', ''))"
            $changed++
        }
    }

Write-Host ""
Write-Host "Done. $changed file(s) updated." -ForegroundColor Green
Write-Host "Restart 'npm run dev' and hard-refresh the browser (Ctrl+Shift+R)."
