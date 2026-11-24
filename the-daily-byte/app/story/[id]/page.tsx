import { redirect } from "next/navigation";

// A página por notícia foi substituída pelo roteiro único do dia.
export default function StoryPage() {
  redirect("/");
}
