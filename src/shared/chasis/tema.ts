/**
 * El tema, en un solo lugar.
 *
 * El CSS portado trae los tres estados a propósito:
 *   :root{…}                                        ← claro
 *   :root[data-theme="dark"]{…}                     ← el usuario eligió oscuro
 *   @media(prefers-color-scheme:dark){:root:not([data-theme="light"]){…}}
 *
 * Por eso la regla es: **sin preferencia guardada NO se pone el atributo** y
 * manda el sistema; con preferencia guardada se pone y manda el usuario, en las
 * dos direcciones.
 */
export const CLAVE_TEMA = 'panel-ventas-tema'
export type Tema = 'light' | 'dark'

/**
 * Corre ANTES del primer pintado, dentro de <head>. Sin esto hay un parpadeo
 * blanco en cada carga para quien tenga el tema oscuro guardado.
 *
 * Va minificado a mano y en try/catch: `localStorage` puede tirar SecurityError
 * según la configuración del navegador, y si tira, el tema del sistema es un
 * default perfectamente bueno.
 */
export const SCRIPT_TEMA = `try{var t=localStorage.getItem('${CLAVE_TEMA}');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}`
