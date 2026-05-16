Perfecto. Este es el orden ideal para que cada cierre te deje material útil para la e2e del siguiente paso.

18.1 → 18.2
Salida: catálogo de assets con estado (alimenta referencias).

19.0 → 19.1 → 19.2
Salida: referencias de assets generadas/importadas (alimenta 3D).

20.0 → 20.1 → 20.2
Salida: candidato 3D por asset (alimenta cleanup).

13.3 (hacerlo aquí como precondición real de backend de cleanup)
Salida: backend de cleanup probado con evidencia real.

21.1 → 21.2
Salida: assets cleaned + handoff cleanup/<run_id>/ (alimenta rigging).

14.2 (hacerlo aquí como precondición real de backend de rigging)
Salida: ruta de rigging validada end-to-end.

22.1 → 22.2
Salida: personaje riggeado validado (alimenta shot planning).

23.1 → 23.2
Salida: shot brief validado (alimenta animación).

24.0 → 24.1 → 24.2
Salida: animación base en Kimodo con contexto (alimenta apply).

25.0 → 25.1 → 25.2
Salida: animación aplicada al personaje (alimenta composición).

26.0 → 26.1 → 26.2
Salida: toma compuesta en Blender (alimenta refine).

27.0 → 27.1 → 27.2
Salida: toma refinada (alimenta export base).

28.1.1 → 28.0 → 28.1 → 28.2
Salida: video base + frames + evidencia (alimenta imagen inicial).

29.0 → 29.1 → 29.2
Salida: imagen inicial validada (alimenta shot generation).

30.0 → 30.1 → 30.2
Salida: tomas generadas validadas (alimenta Resolve assembly).

31.1.1 → 31.0 → 31.1 → 31.2
Salida: assembly de escena validado (alimenta refine en Resolve).

32.0 → 32.1 → 32.2
Salida: escena refinada validada (alimenta export final).

33.0 → 33.1 → 33.2
Salida: export final de escena.

Notas rápidas:

8.18 te conviene cerrarla antes de 19 para bajar riesgo de ComfyUI.
1.2 y 9.11.3 no alimentan directamente esta cadena UI; llévalas en paralelo.