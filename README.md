# CardSaaS

Demo de **SaaS (Software as a Service)**: un creador de tarjetas de presentación digitales con modelo Freemium.

## Estructura

```
cardsaas/
├── package.json
├── server.js
├── data.json
├── .gitignore
├── README.md
└── public/
    ├── index.html        # Acceso + panel de control
    ├── app.js            # Lógica del panel
    ├── card.html         # Vista pública (/u/:username)
    ├── card.js           # Carga y refresca la tarjeta pública
    ├── card-render.js    # Renderizador compartido de la tarjeta
    └── styles.css
```

## Ejecutar en local

```bash
npm install
npm start
# http://localhost:3000
```

## Desplegar en Render

1. Sube el repositorio a GitHub.
2. En Render: **New +** → **Web Service** → conecta el repositorio.
3. Runtime: **Node** · Build Command: `npm install` · Start Command: `npm start`.
4. Despliega. Render asigna el puerto con `PORT` (el servidor ya lo lee).

> **Importante:** el disco del plan gratuito de Render es efímero. Los cambios en `data.json` duran mientras el servicio esté activo; al reiniciar o redesplegar se restaura el `data.json` del repositorio (con `ana` y `carlos`). Para una demo es justo lo que se necesita.

## Guion de demo (qué concepto SaaS muestra cada paso)

| Paso | Qué haces | Concepto SaaS |
|------|-----------|---------------|
| 1 | Abres la URL y entras como Ana con un clic | Acceso desde el navegador, sin instalar |
| 2 | Sales y entras como Carlos | Multi-tenancy: cada cliente ve solo su espacio |
| 3 | Creas un usuario nuevo con solo un nombre | Onboarding inmediato |
| 4 | Editas la tarjeta y abres `/u/tuusuario` en otra pestaña | Servicio en la nube, cambios al instante |
| 5 | En Plan Gratis: 2 colores, 1 enlace y marca de agua | Modelo Freemium |
| 6 | Pulsas "Simular Suscripción Pro" | Suscripción: se desbloquean funciones sin reinstalar nada |
| 7 | Pulsas "Cancelar Pro" | Los planes se pueden cambiar o cancelar en cualquier momento |

## Notas

- El acceso es **sin contraseña** a propósito (demo). No lo uses tal cual en producción.
- Opcional: define la variable de entorno `SESSION_SECRET` para firmar las sesiones.
