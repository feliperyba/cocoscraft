# Reapply Cocos Engine WebGPU Patches
# Run this after a fresh Cocos Creator 3.8.8 reinstall.
#
# Usage:
#   pwsh apply-engine-patches.ps1
#   pwsh apply-engine-patches.ps1 -EngineRoot "C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine"
#
# What it does:
#   1. Copies the modified engine source files over the fresh install
#   2. Copies the pre-built webgpu_wasm.{js,wasm} over the fresh install
#   3. Clears the engine TS cache (forces recompile)
#
# After running, launch CocosCreator to verify WebGPU works.

[CmdletBinding()]
param(
    [string]$EngineRoot = "C:\ProgramData\cocos\editors\Creator\3.8.8\resources\resources\3d\engine"
)

$ErrorActionPreference = "Stop"
$PatchRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ModifiedFiles = Join-Path $PatchRoot "engine-modified-files"
$BuiltWasm = Join-Path $PatchRoot "wasm-backup"

if (-not (Test-Path $EngineRoot)) {
    Write-Error "Engine root not found: $EngineRoot"
    exit 1
}

# Source file mapping: <snapshot filename> -> <relative path under engine root>
$FileMap = @{
    "WGPUDevice.cpp"              = "native\cocos\renderer\gfx-wgpu\WGPUDevice.cpp"
    "WGPUDevice.h"                = "native\cocos\renderer\gfx-wgpu\WGPUDevice.h"
    "WGPUObject.h"                = "native\cocos\renderer\gfx-wgpu\WGPUObject.h"
    "WGPUUtils.h"                 = "native\cocos\renderer\gfx-wgpu\WGPUUtils.h"
    "WGPUUtils.cpp"               = "native\cocos\renderer\gfx-wgpu\WGPUUtils.cpp"
    "WGPUShader.cpp"              = "native\cocos\renderer\gfx-wgpu\WGPUShader.cpp"
    "WGPUDescriptorSetLayout.cpp" = "native\cocos\renderer\gfx-wgpu\WGPUDescriptorSetLayout.cpp"
    "WGPUDescriptorSet.cpp"       = "native\cocos\renderer\gfx-wgpu\WGPUDescriptorSet.cpp"
    "WGPUPipelineLayout.cpp"      = "native\cocos\renderer\gfx-wgpu\WGPUPipelineLayout.cpp"
    "WGPUPipelineLayout.h"        = "native\cocos\renderer\gfx-wgpu\WGPUPipelineLayout.h"
    "GFXDef-common.h"             = "native\cocos\renderer\gfx-base\GFXDef-common.h"
    "gfx-base-define.ts"          = "cocos\gfx\base\define.ts"
    "webgpu-define.ts"            = "cocos\gfx\webgpu\webgpu-define.ts"
    "rendering-define.ts"             = "cocos\rendering\define.ts"
    "webgpu-commands.ts"              = "cocos\gfx\webgpu\webgpu-commands.ts"
    "webgpu-descriptor-set-layout.ts" = "cocos\gfx\webgpu\webgpu-descriptor-set-layout.ts"
    "webgpu-descriptor-set.ts"        = "cocos\gfx\webgpu\webgpu-descriptor-set.ts"
    "webgpu-device.ts"                = "cocos\gfx\webgpu\webgpu-device.ts"
    "webgpu-pipeline-layout.ts"       = "cocos\gfx\webgpu\webgpu-pipeline-layout.ts"
    "webgpu-pipeline-state.ts"        = "cocos\gfx\webgpu\webgpu-pipeline-state.ts"
    "webgpu-command-buffer.ts"        = "cocos\gfx\webgpu\webgpu-command-buffer.ts"
    "webgpu-swapchain.ts"             = "cocos\gfx\webgpu\webgpu-swapchain.ts"
    "webgpu-render-pass.ts"           = "cocos\gfx\webgpu\webgpu-render-pass.ts"
    "webgpu-texture.ts"               = "cocos\gfx\webgpu\webgpu-texture.ts"
    "layout-graph-utils.ts"           = "cocos\rendering\custom\layout-graph-utils.ts"
    "layout-graph-editor.ts"          = "cocos\rendering\custom\layout-graph-editor.ts"
    "web-program-library.ts"          = "cocos\rendering\custom\web-program-library.ts"
    "executor.ts"                     = "cocos\rendering\custom\executor.ts"
    "pass-context.ts"                 = "cocos\rendering\post-process\utils\pass-context.ts"
}

Write-Host "=== Applying Cocos Engine WebGPU Patches ===" -ForegroundColor Cyan
Write-Host "Engine root: $EngineRoot"
Write-Host ""

# Step 1: Copy modified source files
Write-Host "[1/3] Copying modified engine source files..." -ForegroundColor Yellow
$copiedCount = 0
foreach ($filename in $FileMap.Keys) {
    $src = Join-Path $ModifiedFiles $filename
    if (-not (Test-Path $src)) {
        Write-Warning "  Skipping $filename (not found in snapshot)"
        continue
    }
    $relPath = $FileMap[$filename]
    $dst = Join-Path $EngineRoot $relPath
    if (-not (Test-Path (Split-Path $dst -Parent))) {
        Write-Warning "  Skipping $relPath (target directory missing)"
        continue
    }
    Copy-Item $src $dst -Force
    $copiedCount++
    Write-Host "  Replaced: $relPath"
}

# Step 2: Copy built WASM
Write-Host ""
Write-Host "[2/3] Copying pre-built webgpu_wasm.{js,wasm}..." -ForegroundColor Yellow
$wasmDir = Join-Path $EngineRoot "native\external\emscripten\webgpu"
foreach ($ext in @("js", "wasm")) {
    $src = Join-Path $BuiltWasm "webgpu_wasm.built.$ext"
    $dst = Join-Path $wasmDir "webgpu_wasm.$ext"
    if (Test-Path $src) {
        Copy-Item $src $dst -Force
        Write-Host "  Replaced: webgpu_wasm.$ext"
    } else {
        Write-Warning "  Missing: webgpu_wasm.built.$ext"
    }
}

# Step 3: Clear engine TS cache
Write-Host ""
Write-Host "[3/3] Clearing engine TS cache..." -ForegroundColor Yellow
$cacheDir = Join-Path $EngineRoot "bin\.cache"
if (Test-Path $cacheDir) {
    Remove-Item -Recurse -Force $cacheDir
    Write-Host "  Cleared: bin\.cache"
} else {
    Write-Host "  Cache already clear"
}

Write-Host ""
Write-Host "=== Done. $copiedCount source files applied. ===" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Launch CocosCreator.exe"
Write-Host "  2. Open the CocosCraft project"
Write-Host "  3. Preview with WebGPU backend"
Write-Host "  4. Check browser console for '[CocosCraft] converted N textureSample -> textureSampleLevel' logs"
Write-Host "  5. SSAO/SSR/volumetric/shadows should render without errors"
Write-Host ""
Write-Host "If you need to rebuild the WASM from source:" -ForegroundColor DarkGray
Write-Host "  emsdk 3.1.41 + CMake + Ninja required" -ForegroundColor DarkGray
Write-Host "  See engine-patches/embind-bind.cpp (must be applied to emsdk)" -ForegroundColor DarkGray
