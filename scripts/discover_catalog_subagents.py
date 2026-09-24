#!/usr/bin/env python3
"""
scripts/discover_catalog_subagents.py

Extractor y Reconciliador del Catálogo Total mediante Subagentes Especializados en Python.
Utiliza CapabilitiesConfig(enable_subagents=True) de google.antigravity para coordinar:
1. Subagente CatalogDiscovery
2. Subagente TruthExtractor
3. Subagente CatalogReconciler
"""

import os
import sys
import json
import asyncio
from google.antigravity import Agent, CapabilitiesConfig, LocalAgentConfig

# Forzar codificación UTF-8 en stdout/stderr
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

async def run_discovery_pipeline():
    cwd = os.getcwd()
    
    # 1. Configuración del sistema de subagentes
    capabilities = CapabilitiesConfig(
        enable_subagents=True,
        disabled_tools=[]
    )
    
    system_instructions = (
        "Eres el Orquestador Principal del Catálogo EcomShop. Tu responsabilidad es invocar "
        "los subagentes especializados (CatalogDiscovery, TruthExtractor, CatalogReconciler) "
        "para descubrir todos los SKUs y productos reales citados en las fuentes de NotebookLM "
        "y consolidar el catálogo ampliado sin alucinaciones."
    )
    
    agent_config = LocalAgentConfig(
        workspaces=[cwd],
        capabilities=capabilities,
        vertex=True,
        project=os.environ.get("GOOGLE_CLOUD_PROJECT", "ecomshop-marketing-prod"),
        location=os.environ.get("GOOGLE_CLOUD_REGION", "us-central1"),
        model="gemini-2.5-flash",
        system_instructions=system_instructions
    )
    
    prompt = (
        "Ejecuta el mandato de descubrimiento de catálogo en 3 fases mediante subagentes:\n"
        "Fase 1: Invoca CatalogDiscovery para auditar todas las fuentes de NotebookLM (ID: 6ae5b7bb-ab27-4541-80cc-6127730fd01b) "
        "y extraer todos los SKUs, modelos, fabricantes y categorías.\n"
        "Fase 2: Invoca TruthExtractor para obtener los perfiles de ingeniería de cada SKU (interfaces, modulaciones, alimentación, evidencias).\n"
        "Fase 3: Invoca CatalogReconciler para cruzar con los 27 SKUs existentes y marcar su ciclo de vida (DISCOVERED -> VERIFIED -> HOMOLOGATED).\n\n"
        "Devuelve la estructura final consolidada en formato JSON."
    )
    
    print("[DiscoveryPipeline] Iniciando orquestación de subagentes con google.antigravity...", file=sys.stderr)
    
    try:
        async with Agent(agent_config) as agent:
            print(f"[DiscoveryPipeline] Agente activo. Conversation ID: {agent.conversation_id}", file=sys.stderr)
            chat_response = await agent.chat(prompt)
            output_text = await chat_response.text()
            print("[DiscoveryPipeline] Respuesta recibida del agente orquestador:", file=sys.stderr)
            print(output_text)
    except Exception as e:
        print(f"[DiscoveryPipeline] Error durante la ejecución del subagente: {e}", file=sys.stderr)

if __name__ == "__main__":
    asyncio.run(run_discovery_pipeline())
