param([ValidateSet('Inspect','Capture','Keys','Click','PasteFile','Paste','Scroll')] [string]$Action='Inspect', [string]$Value='', [int]$X=0, [int]$Y=0, [int]$Left=0, [int]$Top=0, [int]$Width=0, [int]$Height=0)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type @'
using System;
using System.Runtime.InteropServices;
public class DesktopNative {
 [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd,int nCmdShow);
 [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
 [DllImport("user32.dll")] public static extern bool SetCursorPos(int x,int y);
 [DllImport("user32.dll")] public static extern void mouse_event(uint flags,uint dx,uint dy,uint data,UIntPtr extra);
}
'@
$windows=[System.Windows.Automation.AutomationElement]::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children,[System.Windows.Automation.Condition]::TrueCondition)
$window=$null
foreach($candidate in $windows) {
 try { $p=Get-Process -Id $candidate.Current.ProcessId -ErrorAction SilentlyContinue; if($p.ProcessName -eq 'Postman' -and $candidate.Current.Name) { $window=$candidate; break } } catch {}
}
if(-not $window){throw 'No se encontró la ventana de Postman.'}
$handle=[IntPtr]$window.Current.NativeWindowHandle
[void][DesktopNative]::ShowWindow($handle,9)
[void][DesktopNative]::SetForegroundWindow($handle)
Start-Sleep -Milliseconds 500
if($Action -eq 'Keys') { [System.Windows.Forms.SendKeys]::SendWait($Value); Start-Sleep -Milliseconds 500 }
if($Action -eq 'PasteFile') { [System.Windows.Forms.Clipboard]::SetText([System.IO.File]::ReadAllText((Join-Path (Get-Location) $Value))); [System.Windows.Forms.SendKeys]::SendWait('^v'); Start-Sleep -Milliseconds 700 }
if($Action -eq 'Paste') { [System.Windows.Forms.Clipboard]::SetText($Value); [System.Windows.Forms.SendKeys]::SendWait('^v'); Start-Sleep -Milliseconds 700 }
if($Action -eq 'Click') { $position=$window.Current.BoundingRectangle; [void][DesktopNative]::SetCursorPos(([int]$position.X+$X),([int]$position.Y+$Y)); [DesktopNative]::mouse_event(2,0,0,0,[UIntPtr]::Zero); [DesktopNative]::mouse_event(4,0,0,0,[UIntPtr]::Zero); Start-Sleep -Milliseconds 500 }
if($Action -eq 'Scroll') { $position=$window.Current.BoundingRectangle; [void][DesktopNative]::SetCursorPos(([int]$position.X+$X),([int]$position.Y+$Y)); $count=[int]$Value; $delta=if($count -lt 0){[uint32]4294967176}else{[uint32]120}; for($i=0;$i -lt [Math]::Abs($count);$i++){[DesktopNative]::mouse_event(2048,0,0,$delta,[UIntPtr]::Zero);Start-Sleep -Milliseconds 75};Start-Sleep -Milliseconds 250 }
if($Action -eq 'Capture') {
 $rect=$window.Current.BoundingRectangle
 if($Width -eq 0){$Width=[int]$rect.Width-$Left}; if($Height -eq 0){$Height=[int]$rect.Height-$Top}
 $bitmap=New-Object System.Drawing.Bitmap($Width,$Height)
 $graphics=[System.Drawing.Graphics]::FromImage($bitmap)
 $graphics.CopyFromScreen(([int]$rect.X+$Left),([int]$rect.Y+$Top),0,0,$bitmap.Size)
 $bitmap.Save((Join-Path (Get-Location) $Value),[System.Drawing.Imaging.ImageFormat]::Png)
 $graphics.Dispose();$bitmap.Dispose()
 Write-Output 'Captura real de la ventana guardada.'
} elseif($Action -eq 'Inspect') {
 $window.FindAll([System.Windows.Automation.TreeScope]::Descendants,[System.Windows.Automation.Condition]::TrueCondition) | Select-Object -First 150 @{Name='Type';Expression={$_.Current.ControlType.ProgrammaticName}},@{Name='Name';Expression={$_.Current.Name}},@{Name='Rect';Expression={$_.Current.BoundingRectangle.ToString()}} | ConvertTo-Json -Compress
}
