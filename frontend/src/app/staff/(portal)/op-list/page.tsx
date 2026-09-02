import { redirect } from 'next/navigation';

export default function OpListRedirect() {
  redirect('/staff/patients');
}