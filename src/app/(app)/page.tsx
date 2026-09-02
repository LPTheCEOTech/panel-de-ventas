import { redirect } from 'next/navigation'

/** La raíz manda al Panel — que es la URL que el mockup dibuja en su barra. */
export default function Raiz() {
  redirect('/panel')
}
