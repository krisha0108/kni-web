import { redirect } from "next/navigation";

export default function RestaurantsRedirect() {
  redirect("/admin/restaurants/requests");
}
