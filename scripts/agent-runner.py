#!/usr/bin/env python3
"""
scripts/agent-runner.py

Puente seguro JSONL entre el Multi-Agent Orchestrator de EcomShop y el SDK oficial
google-antigravity (Agent, CapabilitiesConfig, LocalAgentConfig).
Lee comandos JSON desde stdin y emite eventos estructurados por stdout.
Los logs de depuración se dirigen exclusivamente a stderr.
"""

import sys
import json
import asyncio
import os
import traceback

from google.antigravity import Agent, CapabilitiesConfig, LocalAgentConfig


async def process_task(payload: dict) -> None:
    prompt = payload.get("prompt")
    cwd = payload.get("cwd") or os.getcwd()
    system_instructions = payload.get("systemInstructions")
    run_id = payload.get("runId", "run-unknown")
    task_id = payload.get("taskId", "task-unknown")
    model = payload.get("model", "gemini-2.5-flash")
    vertex = payload.get("vertex", True)
    project = payload.get("project", os.environ.get("GOOGLE_CLOUD_PROJECT", "ecomshop-marketing-prod"))
    location = payload.get("location", os.environ.get("GOOGLE_CLOUD_REGION", "us-central1"))

    if not prompt:
        err_event = {
            "type": "error",
            "success": False,
            "errorType": "VALIDATION_ERROR",
            "message": "Missing 'prompt' in payload"
        }
        print(json.dumps(err_event), flush=True)
        return

    # Normalizar texto eliminando posibles caracteres subrogados corruptos
    prompt = prompt.encode("utf-8", "ignore").decode("utf-8")
    if system_instructions:
        system_instructions = system_instructions.encode("utf-8", "ignore").decode("utf-8")

    # Restricción de seguridad: Sólo conceder acceso al workspace/worktree explícito
    resolved_cwd = os.path.abspath(cwd)
    if not os.path.exists(resolved_cwd):
        os.makedirs(resolved_cwd, exist_ok=True)

    # Configuración de capacidades mínimas necesarias (sin subagentes, sin terminal arbitrario)
    capabilities = CapabilitiesConfig(
        enable_subagents=False,
        disabled_tools=[
            "run_command",
            "ask_question",
            "start_subagent",
            "generate_image",
            "search_web",
            "read_url_content",
            "schedule"
        ]
    )

    agent_config = LocalAgentConfig(
        workspaces=[resolved_cwd],
        capabilities=capabilities,
        vertex=vertex,
        project=project,
        location=location,
        model=model,
        system_instructions=system_instructions if system_instructions else None
    )

    sys.stderr.write(f"[AgentRunner] Starting task {task_id} in {resolved_cwd} with model {model}\n")
    sys.stderr.flush()

    try:
        async with Agent(agent_config) as agent:
            conversation_id = agent.conversation_id
            sys.stderr.write(f"[AgentRunner] Agent started. conversation_id={conversation_id}\n")
            sys.stderr.flush()

            chat_response = await agent.chat(prompt)
            output_text = await chat_response.text()

            result_event = {
                "type": "result",
                "success": True,
                "text": output_text.strip(),
                "conversationId": conversation_id or "session-local",
                "runId": run_id,
                "taskId": task_id
            }
            print(json.dumps(result_event), flush=True)

    except Exception as exc:
        sys.stderr.write(f"[AgentRunner] Execution error: {traceback.format_exc()}\n")
        sys.stderr.flush()
        err_event = {
            "type": "error",
            "success": False,
            "errorType": "ANTIGRAVITY_EXECUTION_ERROR",
            "message": str(exc),
            "runId": run_id,
            "taskId": task_id
        }
        print(json.dumps(err_event), flush=True)


async def main():
    # Asegurar codificación UTF-8 estricta en stdin
    if hasattr(sys.stdin, "reconfigure"):
        sys.stdin.reconfigure(encoding="utf-8", errors="replace")

    # Leer entrada JSONL desde stdin
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        err_event = {
            "type": "error",
            "success": False,
            "errorType": "EMPTY_INPUT",
            "message": "No JSON payload received on stdin"
        }
        print(json.dumps(err_event), flush=True)
        sys.exit(1)

    for line in raw_input.splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            payload = json.loads(line)
            await process_task(payload)
        except json.JSONDecodeError as jde:
            err_event = {
                "type": "error",
                "success": False,
                "errorType": "JSON_PARSE_ERROR",
                "message": f"Invalid JSON line: {jde}"
            }
            print(json.dumps(err_event), flush=True)
            sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
