param(
    [Parameter(Position = 0)]
    [string]$Command = "help",

    [Parameter(Position = 1)]
    [string]$Branch = "",

    [Parameter(Position = 2)]
    [string]$Extra = ""
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = (Resolve-Path "$ScriptDir\..").Path
$ParentDir = (Resolve-Path "$RepoRoot\..").Path
$WorktreesBase = Join-Path $ParentDir ".worktrees"

if (-not (Test-Path $WorktreesBase)) {
    New-Item -ItemType Directory -Path $WorktreesBase -Force | Out-Null
}

function Show-Help {
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "  Git Worktree Manager - ecomshop-content" -ForegroundColor Green
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "Uso:"
    Write-Host "  npm run wt:new <nombre-rama> [rama-base]  -> Crear worktree instantaneo" -ForegroundColor Yellow
    Write-Host "  npm run wt:list                          -> Listar todos los worktrees activos" -ForegroundColor Yellow
    Write-Host "  npm run wt:remove <nombre-rama>           -> Eliminar y limpiar un worktree" -ForegroundColor Yellow
    Write-Host "  npm run wt:dev <nombre-rama> [puerto]     -> Iniciar servidor de desarrollo en puerto" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Ejemplos:" -ForegroundColor Gray
    Write-Host "  npm run wt:new feat/ia-generativa" -ForegroundColor Gray
    Write-Host "  npm run wt:dev feat/ia-generativa 3001" -ForegroundColor Gray
    Write-Host "  npm run wt:remove feat/ia-generativa" -ForegroundColor Gray
}

function Clean-Branch-Name([string]$name) {
    return ($name -replace '[\\/]', '-').Trim('-')
}

switch ($Command.ToLower()) {
    "new" {
        if ([string]::IsNullOrWhiteSpace($Branch)) {
            Write-Error "Debes indicar el nombre de la rama. Ejemplo: npm run wt:new feat/nueva-interfaz"
            exit 1
        }

        $CleanFolder = Clean-Branch-Name $Branch
        $TargetPath = Join-Path $WorktreesBase $CleanFolder
        $BaseBranch = if ([string]::IsNullOrWhiteSpace($Extra)) { "main" } else { $Extra }

        if (Test-Path $TargetPath) {
            Write-Host "El directorio $TargetPath ya existe." -ForegroundColor Yellow
            exit 1
        }

        Write-Host "Creando worktree para '$Branch' desde '$BaseBranch'..." -ForegroundColor Cyan

        Push-Location $RepoRoot
        try {
            $branchExists = git branch --list $Branch
            if ($branchExists) {
                git worktree add $TargetPath $Branch
            } else {
                git worktree add -b $Branch $TargetPath $BaseBranch
            }
        } finally {
            Pop-Location
        }

        if (-not (Test-Path $TargetPath)) {
            Write-Error "Fallo al crear el directorio del worktree."
            exit 1
        }

        # 1. Enlazar node_modules mediante Junction NTFS (Cero copia, instantaneo)
        $MainNodeModules = Join-Path $RepoRoot "node_modules"
        $TargetNodeModules = Join-Path $TargetPath "node_modules"
        if (Test-Path $MainNodeModules) {
            Write-Host "Vinculando node_modules (Junction NTFS instantaneo)..." -ForegroundColor Green
            New-Item -ItemType Junction -Path $TargetNodeModules -Target $MainNodeModules | Out-Null
        } else {
            Write-Host "No se encontro node_modules en la raiz. Ejecuta npm install en el principal." -ForegroundColor Yellow
        }

        # 2. Copiar variables de entorno .env.local
        $MainEnv = Join-Path $RepoRoot ".env.local"
        $TargetEnv = Join-Path $TargetPath ".env.local"
        if (Test-Path $MainEnv) {
            Write-Host "Copiando .env.local con credenciales activas..." -ForegroundColor Green
            Copy-Item $MainEnv -Destination $TargetEnv -Force
        }

        Write-Host ""
        Write-Host "==========================================================" -ForegroundColor Green
        Write-Host "Worktree '$Branch' creado exitosamente!" -ForegroundColor Green
        Write-Host "Ubicacion: $TargetPath" -ForegroundColor White
        Write-Host "Comandos para empezar:" -ForegroundColor Cyan
        Write-Host "  cd '$TargetPath'" -ForegroundColor Yellow
        Write-Host "  npm run dev -- -p 3001" -ForegroundColor Yellow
        Write-Host "==========================================================" -ForegroundColor Green
    }

    "list" {
        Write-Host "Worktrees activos en el repositorio:" -ForegroundColor Cyan
        Push-Location $RepoRoot
        try {
            git worktree list
        } finally {
            Pop-Location
        }
    }

    "remove" {
        if ([string]::IsNullOrWhiteSpace($Branch)) {
            Write-Error "Debes indicar el nombre de la rama a eliminar. Ejemplo: npm run wt:remove feat/nueva-interfaz"
            exit 1
        }

        $CleanFolder = Clean-Branch-Name $Branch
        $TargetPath = Join-Path $WorktreesBase $CleanFolder
        $TargetNodeModules = Join-Path $TargetPath "node_modules"

        Write-Host "Desmontando worktree '$Branch'..." -ForegroundColor Yellow

        # 1. Desvincular junction de node_modules de forma segura (sin tocar la carpeta original)
        if (Test-Path $TargetNodeModules) {
            cmd /c rmdir "$TargetNodeModules" 2>$null
        }

        Push-Location $RepoRoot
        try {
            git worktree remove $TargetPath --force 2>$null
            git worktree prune
        } finally {
            Pop-Location
        }

        if (Test-Path $TargetPath) {
            Write-Host "Limpiando directorio residual..." -ForegroundColor Gray
            if (Test-Path $TargetNodeModules) {
                cmd /c rmdir "$TargetNodeModules" 2>$null
            }
            if (Test-Path $TargetNodeModules) {
                Write-Warning "node_modules aun existe. Omitiendo borrado de carpeta para proteger el repositorio principal."
            } else {
                Remove-Item -Path $TargetPath -Recurse -Force -ErrorAction SilentlyContinue
            }
        }

        Write-Host "Worktree eliminado correctamente." -ForegroundColor Green
    }

    "dev" {
        if ([string]::IsNullOrWhiteSpace($Branch)) {
            Write-Error "Indica el nombre de la rama. Ejemplo: npm run wt:dev feat/nueva-interfaz [puerto]"
            exit 1
        }

        $CleanFolder = Clean-Branch-Name $Branch
        $TargetPath = Join-Path $WorktreesBase $CleanFolder
        $Port = if ([string]::IsNullOrWhiteSpace($Extra)) { "3001" } else { $Extra }

        if (-not (Test-Path $TargetPath)) {
            Write-Error "No se encontro el worktree en: $TargetPath"
            exit 1
        }

        Write-Host "Iniciando entorno de desarrollo en $TargetPath (Puerto $Port)..." -ForegroundColor Cyan
        Push-Location $TargetPath
        try {
            npm run dev -- -p $Port
        } finally {
            Pop-Location
        }
    }

    default {
        Show-Help
    }
}
