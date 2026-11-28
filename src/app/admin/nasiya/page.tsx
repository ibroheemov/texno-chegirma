import { redirect } from "next/navigation";

// The menu entry "Nasiya" is now "Qarz daftari" and opens in the Old design (/admin/qarz-daftari; the New design has its own copy). Moliya -> Nasiya (the
// store's own sale credit) is a different screen and is unchanged. Old bookmarks land here.
export default function NasiyaPage() {
  redirect("/admin/qarz-daftari");
}
