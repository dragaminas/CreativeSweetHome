Sí. Aquí va el resumen y los comandos/prompts útiles para repetir la comparación con **Qwen3-Coder-Next** usando el mismo patrón que probamos con **Qwen3.6-35B-A3B**.

## Resumen de la conversación

Probamos primero **Qwen3.6-35B-A3B-UD-Q4_K_M** con `llama.cpp TurboQuant fork` en la RTX 3090. El modelo cargó bien, usó GPU y respondió rápido: alrededor de **35–37 tok/s**.

Al inicio el modelo devolvía todo en `reasoning_content` y no en `content`. Se resolvió añadiendo:

```json
"chat_template_kwargs": {
  "enable_thinking": false
}
```

Luego lo usamos con Roo Code mediante **OpenAI Compatible** apuntando a:

```text
http://127.0.0.1:8081/v1
```

Con Roo/Superpowers hizo varias tareas pequeñas: crear utilidades, añadir tests, corregir tests, analizar metadata del proyecto. Se comportó bastante bien, aunque cometió errores típicos: insertó un test con mala indentación, reportó éxito aunque el test no se estaba recogiendo, e hizo inferencias algo débiles en el análisis del repo.

Después probamos **Qwen3-Coder-Next-UD-Q3_K_XL**. Cargó con el mismo sistema y respondió correctamente, con unos **32 tok/s** en una prueba simple. Ahora quieres comparar ambos con los mismos prompts.

---

# Comandos usados con Qwen3.6

## 1. Arrancar Qwen3.6 con llama.cpp TurboQuant

```bash
~/llama-cpp-turboquant/build/bin/llama-server \
  --model "/home/eric/models/qwen3.6-35b-a3b/Qwen3.6-35B-A3B-UD-Q4_K_M.gguf" \
  --host 127.0.0.1 \
  --port 8081 \
  --n-gpu-layers 999 \
  --n-cpu-moe 35 \
  --ctx-size 32768 \
  --flash-attn on \
  --no-mmap \
  --mlock \
  --cache-type-k turbo4 \
  --cache-type-v turbo3 \
  --jinja
```

## 2. Confirmar que el endpoint estaba vivo

```bash
curl http://127.0.0.1:8081/v1/models
```

## 3. Primer test de generación con streaming

Este fue el que devolvió chunks y se quedó en `reasoning_content`:

```bash
curl http://127.0.0.1:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.6-35B-A3B-UD-Q4_K_M.gguf",
    "messages": [
      {
        "role": "user",
        "content": "Write a small TypeScript function that converts snake_case to camelCase. Return only code."
      }
    ],
    "temperature": 0.2,
    "max_tokens": 300,
    "stream": true
  }'
```

## 4. Segundo test sin streaming, con `/no_think`

Este todavía falló porque siguió usando `reasoning_content`:

```bash
curl http://127.0.0.1:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.6-35B-A3B-UD-Q4_K_M.gguf",
    "messages": [
      {
        "role": "user",
        "content": "/no_think\nWrite a small TypeScript function that converts snake_case to camelCase. Return only code."
      }
    ],
    "temperature": 0.2,
    "max_tokens": 800,
    "stream": false
  }'
```

## 5. Test correcto con `chat_template_kwargs`

Este fue el que funcionó bien:

```bash
curl http://127.0.0.1:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3.6-35B-A3B-UD-Q4_K_M.gguf",
    "messages": [
      {
        "role": "user",
        "content": "Write a small TypeScript function that converts snake_case to camelCase. Return only code."
      }
    ],
    "chat_template_kwargs": {
      "enable_thinking": false
    },
    "temperature": 0.2,
    "max_tokens": 300,
    "stream": false
  }'
```

Respuesta que dio Qwen3.6:

```typescript
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, char) => char.toUpperCase());
}
```

---

# Comando equivalente para lanzar Qwen3-Coder-Next

Este es el que estás usando para comparar:

```bash
MODEL_PATH="$HOME/models/qwen3-coder-next/Qwen3-Coder-Next-UD-Q3_K_XL.gguf" \
PORT=8081 \
CTX_SIZE=32768 \
N_CPU_MOE=35 \
~/start-llamacpp-model.sh
```

O expandido, equivalente al anterior:

```bash
~/llama-cpp-turboquant/build/bin/llama-server \
  --model "$HOME/models/qwen3-coder-next/Qwen3-Coder-Next-UD-Q3_K_XL.gguf" \
  --host 127.0.0.1 \
  --port 8081 \
  --n-gpu-layers 999 \
  --n-cpu-moe 35 \
  --ctx-size 32768 \
  --flash-attn on \
  --no-mmap \
  --mlock \
  --cache-type-k turbo4 \
  --cache-type-v turbo3 \
  --jinja
```

Para repetir exactamente el test simple:

```bash
curl http://127.0.0.1:8081/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "Qwen3-Coder-Next-UD-Q3_K_XL.gguf",
    "messages": [
      {
        "role": "user",
        "content": "Write a small TypeScript function that converts snake_case to camelCase. Return only code."
      }
    ],
    "chat_template_kwargs": {
      "enable_thinking": false
    },
    "temperature": 0.2,
    "max_tokens": 300,
    "stream": false
  }'
```

---

# Prompts usados en Roo/Superpowers para comparar

## 1. Crear función inicial

```text
Create a small TypeScript function in src that converts camelCase to snake_case.

Requirements:
- Function name: camelToSnake
- Input: string
- Output: string
- Add or update the smallest reasonable file in src
- Return only a brief summary of what you changed
```

Luego, al detectar que el repo era Python, Roo preguntó si debía instalar Node o cambiar a Python, y se le permitió hacerlo en Python.

## 2. Revisar implementación sin cambiar por cambiar

```text
Review the current camel_to_snake implementation.

If the implementation can be made simpler or more robust without changing behavior, update it.
Keep all existing tests passing.
Do not add new dependencies.
Run the relevant tests.
Return only a brief summary and the test result.
```

## 3. Añadir función inversa

```text
Add a reverse utility function snake_to_camel next to camel_to_snake.

Requirements:
- Function name: snake_to_camel
- Keep comments and docstrings in English
- Add tests for normal snake_case, already camelCase, empty string, and multiple underscores
- Do not refactor unrelated code
- Run the relevant tests
- Return only a brief summary and test result
```

## 4. Hacer el test más estricto

```text
Tighten the snake_to_camel tests.

Requirements:
- Make test_snake_to_camel_multiple_underscores assert exactly "fooBar"
- Merge duplicate imports from openclaw_studio.utils into a single import
- Do not change production code unless required by the stricter test
- Run the relevant tests
- Return only a brief summary and test result
```

## 5. Tarea de análisis de proyecto

```text
Inspect the project metadata and test setup.

Requirements:
- Read only top-level project metadata files if they exist:
  - pyproject.toml
  - setup.py
  - setup.cfg
  - package.json
  - README.md
- Do not modify any files.
- Do not run install commands.
- Do not inspect unrelated directories.
- Report:
  - package/project name
  - source directory
  - test framework
  - exact test command currently supported
  - whether formatting or linting tools are configured
- If a file does not exist, say "not found".
- Return only a concise report.
```

## 6. Añadir edge case pequeño

Este prompt reveló el error de indentación:

```text
Update the existing camel_to_snake tests with one small additional edge case.

Requirements:
- Add a test for a camelCase string containing a number, for example "version2Value" -> "version2_value"
- Do not modify production code unless the new test fails
- Do not inspect unrelated files
- Run only the relevant pytest file
- Return only a brief summary and test result
```

## 7. Corregir indentación del test

```text
Fix the indentation of test_camel_case_with_number in tests/test_camel_to_snake.py.

Requirements:
- Move test_camel_case_with_number to module level, not nested inside test_starts_with_uppercase
- Do not change production code
- Run pytest tests/test_camel_to_snake.py -q
- The result should be 12 passed
- Return only a brief summary and test result
```

---

# Regla extra que aprendimos para próximos prompts

Conviene añadir esto en tareas reales:

```text
Follow the existing project conventions. Do not introduce new frameworks, dependencies, test styles, commands, or infrastructure unless explicitly requested. If unsure, ask before changing conventions.
```

Y para tests:

```text
After adding tests, verify that the collected test count increased as expected.
```
