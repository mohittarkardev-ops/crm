import { notFound } from "next/navigation";

/** Every module now has its own route; anything else is a 404. */
export default function UnknownSectionPage() {
  notFound();
}
